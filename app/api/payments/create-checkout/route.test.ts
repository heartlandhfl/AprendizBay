import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHECKOUT_ERRORS } from "@/lib/payments/create-checkout";

const {
  mockCreateBookingCheckout,
  mockVerifyUserIdToken,
  mockGetUserProfile,
} = vi.hoisted(() => ({
  mockCreateBookingCheckout: vi.fn(),
  mockVerifyUserIdToken: vi.fn(),
  mockGetUserProfile: vi.fn(),
}));

vi.mock("@/lib/payments/create-checkout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/create-checkout")>();
  return {
    ...actual,
    createBookingCheckout: mockCreateBookingCheckout,
  };
});

vi.mock("@/lib/auth/admin-server", () => ({
  verifyUserIdToken: mockVerifyUserIdToken,
  getUserProfile: mockGetUserProfile,
}));

vi.mock("@/lib/observability/sentry-server", () => ({
  captureServerException: vi.fn(),
}));

import { POST } from "@/app/api/payments/create-checkout/route";

const VALID_BODY = {
  bookingId: "booking-123",
  cpf: "24971563792",
  email: "ana@test.com",
  phone: "47988887777",
  address: "Rua das Flores",
  addressNumber: "100",
  postalCode: "01310-000",
  province: "Centro",
};

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/payments/create-checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer token-student-1",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/payments/create-checkout", () => {
  beforeEach(() => {
    mockCreateBookingCheckout.mockReset();
    mockVerifyUserIdToken.mockReset();
    mockGetUserProfile.mockReset();
    mockVerifyUserIdToken.mockResolvedValue({ uid: "student-1", email: "ana@test.com" });
    mockGetUserProfile.mockResolvedValue({
      role: "student",
      displayName: "Ana Souza",
      email: "ana@test.com",
    });
  });

  it("creates a valid checkout without forwarding browser price fields", async () => {
    mockCreateBookingCheckout.mockResolvedValue({
      ok: true,
      checkoutId: "checkout-abc",
      checkoutUrl: "https://asaas.com/checkoutSession/show?id=checkout-abc",
      reused: false,
    });

    const response = await POST(
      jsonRequest({ ...VALID_BODY, price: 1, platformFee: 0, tutorAmount: 1 }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.checkoutUrl).toContain("checkout-abc");
    expect(mockCreateBookingCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "student-1",
        bookingId: "booking-123",
      }),
    );
    const argument = mockCreateBookingCheckout.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(argument).not.toHaveProperty("price");
    expect(argument).not.toHaveProperty("platformFee");
    expect(argument).not.toHaveProperty("tutorAmount");
  });

  it("maps a missing booking to Portuguese 404", async () => {
    mockCreateBookingCheckout.mockResolvedValue({
      ok: false,
      status: 404,
      error: CHECKOUT_ERRORS.notFound,
    });

    const response = await POST(jsonRequest(VALID_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(404);
    expect(payload.error).toBe("Reserva não encontrada.");
  });

  it("maps another student's booking to Portuguese 403", async () => {
    mockCreateBookingCheckout.mockResolvedValue({
      ok: false,
      status: 403,
      error: CHECKOUT_ERRORS.notOwner,
    });

    const response = await POST(jsonRequest(VALID_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Você só pode pagar as suas próprias reservas.");
  });

  it("maps cancelled, paid and confirmed bookings to Portuguese 409", async () => {
    mockCreateBookingCheckout.mockResolvedValue({
      ok: false,
      status: 409,
      error: CHECKOUT_ERRORS.cancelled,
    });
    expect((await (await POST(jsonRequest(VALID_BODY))).json()).error).toBe(
      "Esta reserva foi cancelada.",
    );

    mockCreateBookingCheckout.mockResolvedValue({
      ok: false,
      status: 409,
      error: CHECKOUT_ERRORS.alreadyPaid,
    });
    expect((await (await POST(jsonRequest(VALID_BODY))).json()).error).toBe(
      "Esta reserva já foi paga.",
    );

    mockCreateBookingCheckout.mockResolvedValue({
      ok: false,
      status: 409,
      error: CHECKOUT_ERRORS.alreadyConfirmed,
    });
    expect((await (await POST(jsonRequest(VALID_BODY))).json()).error).toBe(
      "Esta reserva já está confirmada.",
    );
  });

  it("maps a duplicate checkout request to the existing session", async () => {
    mockCreateBookingCheckout.mockResolvedValue({
      ok: true,
      checkoutId: "checkout-abc",
      checkoutUrl: "https://asaas.com/checkoutSession/show?id=checkout-abc",
      reused: true,
    });

    const response = await POST(jsonRequest(VALID_BODY));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.checkoutId).toBe("checkout-abc");
    expect(payload.checkoutUrl).toContain("checkout-abc");
  });

  it("maps invalid price and missing Asaas configuration", async () => {
    mockCreateBookingCheckout.mockResolvedValue({
      ok: false,
      status: 400,
      error: CHECKOUT_ERRORS.invalidPrice,
    });
    const invalidPrice = await POST(jsonRequest(VALID_BODY));
    expect(invalidPrice.status).toBe(400);
    expect((await invalidPrice.json()).error).toBe("O valor da reserva é inválido.");

    mockCreateBookingCheckout.mockResolvedValue({
      ok: false,
      status: 503,
      error: CHECKOUT_ERRORS.asaasMissing,
    });
    const missingAsaas = await POST(jsonRequest(VALID_BODY));
    expect(missingAsaas.status).toBe(503);
    expect((await missingAsaas.json()).error).toBe(
      "A configuração de pagamento não está disponível.",
    );
  });
});
