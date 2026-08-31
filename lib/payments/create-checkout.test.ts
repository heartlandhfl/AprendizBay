import { describe, expect, it, vi } from "vitest";
import type { BookingRecord } from "@/lib/bookings/server";
import type { AsaasCheckoutResult, AsaasCustomerData } from "@/lib/payments/asaas";
import {
  CHECKOUT_ERRORS,
  createBookingCheckout,
  createMemoryCheckoutStore,
} from "@/lib/payments/create-checkout";

const CUSTOMER: AsaasCustomerData = {
  name: "Ana Souza",
  cpfCnpj: "24971563792",
  email: "ana@test.com",
  phone: "47988887777",
  address: "Rua das Flores",
  addressNumber: "100",
  postalCode: "01310000",
  province: "Centro",
};

function payableBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "booking-123",
    studentId: "student-1",
    tutorId: "tutor-1",
    type: "individual",
    status: "pending",
    price: 80,
    paymentStatus: "awaiting_payment",
    scheduledAt: new Date("2026-09-08T19:00:00Z"),
    ...overrides,
  };
}

function createdCheckout(
  overrides: Partial<AsaasCheckoutResult> = {},
): AsaasCheckoutResult {
  return {
    id: "checkout-abc",
    checkoutUrl: "https://asaas.com/checkoutSession/show?id=checkout-abc",
    status: "ACTIVE",
    ...overrides,
  };
}

async function runCheckout(
  booking: BookingRecord,
  options: {
    uid?: string;
    createCheckout?: ReturnType<typeof vi.fn>;
    inspectCheckout?: ReturnType<typeof vi.fn>;
    requireAsaasConfigured?: () => void;
    tutorVerified?: boolean;
    now?: Date;
  } = {},
) {
  const store = createMemoryCheckoutStore(
    new Map([[booking.id, booking]]),
    new Map([["tutor-1", { isVerified: options.tutorVerified ?? true }]]),
  );
  const createCheckout =
    options.createCheckout ??
    vi.fn(async () => createdCheckout());
  const inspectCheckout = options.inspectCheckout ?? vi.fn(async () => null);
  const result = await createBookingCheckout(
    {
      uid: options.uid ?? "student-1",
      bookingId: booking.id,
      customer: CUSTOMER,
      siteUrl: "https://www.aprendizbay.com.br",
    },
    {
      store,
      createCheckout,
      inspectCheckout,
      requireAsaasConfigured: options.requireAsaasConfigured ?? (() => undefined),
      now: options.now ? () => options.now! : undefined,
    },
  );
  return { result, store, createCheckout, inspectCheckout };
}

describe("createBookingCheckout", () => {
  it("creates a checkout from server-side booking data", async () => {
    const { result, createCheckout, store } = await runCheckout(payableBooking());

    expect(result).toMatchObject({
      ok: true,
      reused: false,
      checkoutId: "checkout-abc",
    });
    expect(createCheckout).toHaveBeenCalledTimes(1);
    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "booking-123",
        value: 80,
      }),
    );
    expect(createCheckout.mock.calls[0]?.[0]).not.toHaveProperty("price");
    expect(createCheckout.mock.calls[0]?.[0]).not.toHaveProperty("platformFee");
    expect(createCheckout.mock.calls[0]?.[0]).not.toHaveProperty("tutorAmount");
    expect(store.bookings.get("booking-123")?.asaasCheckoutId).toBe("checkout-abc");
  });

  it("ignores a browser-supplied price and charges the stored booking amount", async () => {
    const createCheckout = vi.fn(async (input: { value: number }) => {
      expect(input.value).toBe(80);
      return createdCheckout();
    });

    await runCheckout(payableBooking({ price: 80 }), { createCheckout });
    expect(createCheckout.mock.calls[0]?.[0]).not.toEqual(
      expect.objectContaining({ value: 1 }),
    );
  });

  it("returns not found when the booking does not exist", async () => {
    const store = createMemoryCheckoutStore(
      new Map(),
      new Map([["tutor-1", { isVerified: true }]]),
    );
    const result = await createBookingCheckout(
      {
        uid: "student-1",
        bookingId: "missing",
        customer: CUSTOMER,
        siteUrl: "https://www.aprendizbay.com.br",
      },
      {
        store,
        createCheckout: vi.fn(),
        inspectCheckout: vi.fn(async () => null),
        requireAsaasConfigured: () => undefined,
      },
    );

    expect(result).toEqual({
      ok: false,
      status: 404,
      error: CHECKOUT_ERRORS.notFound,
    });
  });

  it("rejects another student's booking", async () => {
    const { result, createCheckout } = await runCheckout(payableBooking(), {
      uid: "student-2",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: CHECKOUT_ERRORS.notOwner,
    });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("rejects a cancelled booking", async () => {
    const { result, createCheckout } = await runCheckout(
      payableBooking({ status: "cancelled" }),
    );

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: CHECKOUT_ERRORS.cancelled,
    });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("rejects an already-paid booking", async () => {
    const { result, createCheckout } = await runCheckout(
      payableBooking({ paymentStatus: "paid", status: "confirmed" }),
    );

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: CHECKOUT_ERRORS.alreadyPaid,
    });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("rejects an already-confirmed booking", async () => {
    const { result, createCheckout } = await runCheckout(
      payableBooking({ status: "confirmed", paymentStatus: "awaiting_payment" }),
    );

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: CHECKOUT_ERRORS.alreadyConfirmed,
    });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("reuses an existing active checkout instead of creating another", async () => {
    const createCheckout = vi.fn(async () => createdCheckout());
    const inspectCheckout = vi.fn(async () => createdCheckout({ status: "ACTIVE" }));
    const { result } = await runCheckout(
      payableBooking({ asaasCheckoutId: "checkout-abc" }),
      { createCheckout, inspectCheckout },
    );

    expect(result).toMatchObject({
      ok: true,
      reused: true,
      checkoutId: "checkout-abc",
    });
    expect(createCheckout).not.toHaveBeenCalled();
    expect(inspectCheckout).toHaveBeenCalledWith("checkout-abc");
  });

  it("recreates a checkout when Asaas reports the stored session as expired", async () => {
    const createCheckout = vi.fn(async () =>
      createdCheckout({ id: "checkout-new", checkoutUrl: "https://asaas.com/checkoutSession/show?id=checkout-new" }),
    );
    const { result } = await runCheckout(
      payableBooking({ asaasCheckoutId: "checkout-old" }),
      {
        createCheckout,
        inspectCheckout: vi.fn(async () =>
          createdCheckout({ id: "checkout-old", status: "EXPIRED" }),
        ),
      },
    );

    expect(result).toMatchObject({
      ok: true,
      reused: false,
      checkoutId: "checkout-new",
    });
    expect(createCheckout).toHaveBeenCalledTimes(1);
    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: "booking-123", value: 80 }),
    );
  });

  it("treats a paid Asaas checkout as already paid", async () => {
    const createCheckout = vi.fn(async () => createdCheckout());
    const { result } = await runCheckout(
      payableBooking({ asaasCheckoutId: "checkout-abc" }),
      {
        createCheckout,
        inspectCheckout: vi.fn(async () => createdCheckout({ status: "PAID" })),
      },
    );

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: CHECKOUT_ERRORS.alreadyPaid,
    });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("creates a new checkout when the stored session has expired locally", async () => {
    const createCheckout = vi.fn(async () => createdCheckout({ id: "checkout-new" }));
    const { result } = await runCheckout(
      payableBooking({
        asaasCheckoutId: "checkout-old",
        asaasCheckoutExpiresAt: new Date("2026-08-01T12:00:00Z"),
      }),
      {
        createCheckout,
        inspectCheckout: vi.fn(async () => null),
        now: new Date("2026-09-01T12:00:00Z"),
      },
    );

    expect(result).toMatchObject({ ok: true, reused: false, checkoutId: "checkout-new" });
    expect(createCheckout).toHaveBeenCalledTimes(1);
  });

  it("rejects an unverified tutor", async () => {
    const { result, createCheckout } = await runCheckout(payableBooking(), {
      tutorVerified: false,
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: CHECKOUT_ERRORS.tutorIneligible,
    });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("reuses a stored checkout when Asaas cannot be inspected and it has not expired", async () => {
    const createCheckout = vi.fn(async () => createdCheckout());
    const { result } = await runCheckout(
      payableBooking({
        asaasCheckoutId: "checkout-abc",
        asaasCheckoutExpiresAt: new Date("2026-09-02T12:00:00Z"),
      }),
      {
        createCheckout,
        inspectCheckout: vi.fn(async () => null),
      },
    );

    expect(result).toMatchObject({ ok: true, reused: true, checkoutId: "checkout-abc" });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("rejects an invalid stored price", async () => {
    const { result, createCheckout } = await runCheckout(payableBooking({ price: 0 }));

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: CHECKOUT_ERRORS.invalidPrice,
    });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("returns a Portuguese error when Asaas is not configured", async () => {
    const { result, createCheckout } = await runCheckout(payableBooking(), {
      requireAsaasConfigured: () => {
        throw new Error("ASAAS_API_KEY is not configured.");
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 503,
      error: CHECKOUT_ERRORS.asaasMissing,
    });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("reuses the checkout created by a previous successful request", async () => {
    const { result, store, createCheckout } = await runCheckout(payableBooking(), {
      now: new Date("2026-09-01T12:00:00Z"),
    });
    expect(result.ok).toBe(true);

    const second = await createBookingCheckout(
      {
        uid: "student-1",
        bookingId: "booking-123",
        customer: CUSTOMER,
        siteUrl: "https://www.aprendizbay.com.br",
      },
      {
        store,
        createCheckout,
        inspectCheckout: vi.fn(async () => null),
        requireAsaasConfigured: () => undefined,
        now: () => new Date("2026-09-01T12:00:00Z"),
      },
    );

    expect(second).toMatchObject({
      ok: true,
      reused: true,
      checkoutId: "checkout-abc",
    });
    expect(createCheckout).toHaveBeenCalledTimes(1);
  });

  it("lets only one concurrent create call the Asaas API", async () => {
    const store = createMemoryCheckoutStore(
      new Map([["booking-123", payableBooking()]]),
      new Map([["tutor-1", { isVerified: true }]]),
    );
    const createCheckout = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return createdCheckout();
    });
    const input = {
      uid: "student-1",
      bookingId: "booking-123",
      customer: CUSTOMER,
      siteUrl: "https://www.aprendizbay.com.br",
    } as const;
    const deps = {
      store,
      createCheckout,
      inspectCheckout: vi.fn(async () => null),
      requireAsaasConfigured: () => undefined,
    };

    const [first, second] = await Promise.all([
      createBookingCheckout(input, deps),
      createBookingCheckout(input, deps),
    ]);

    const kinds = [first, second].map((item) =>
      item.ok ? "created" : item.error,
    );
    expect(kinds).toContain("created");
    expect(createCheckout.mock.calls.length).toBe(1);
  });
});
