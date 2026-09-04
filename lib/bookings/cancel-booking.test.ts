import { describe, expect, it, vi } from "vitest";
import type { BookingRecord } from "@/lib/bookings/server";
import {
  CANCEL_ERRORS,
  CancelBookingError,
  capRefundAmount,
  decideCancellation,
  describeCancellation,
  resolveCancelActor,
} from "@/lib/bookings/cancellation";
import {
  createMemoryCancelStore,
  executeCancelBooking,
  type CancelBookingDeps,
} from "@/lib/bookings/cancel-booking";

const NOW = new Date("2026-08-30T12:00:00.000Z");
const IN_THREE_DAYS = new Date("2026-09-02T12:00:00.000Z");
const IN_TWELVE_HOURS = new Date("2026-08-31T00:00:00.000Z");

function booking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "booking-123",
    studentId: "student-1",
    tutorId: "tutor-1",
    type: "individual",
    status: "confirmed",
    price: 80,
    paymentStatus: "paid",
    paymentId: "pay_080225913252",
    scheduledAt: IN_THREE_DAYS,
    ...overrides,
  };
}

function successfulRefund() {
  return {
    paymentId: "pay_080225913252",
    status: "refunded" as const,
    refundId: "E123",
    refundAmount: 80,
  };
}

async function cancel(
  record: BookingRecord,
  options: {
    uid?: string;
    refundPayment?: CancelBookingDeps["refundPayment"];
    reverseCommission?: CancelBookingDeps["reverseCommission"];
    now?: Date;
  } = {},
) {
  const store = createMemoryCancelStore(new Map([[record.id, record]]));
  const refundPayment =
    options.refundPayment ??
    vi.fn(async () => successfulRefund());
  const result = await executeCancelBooking(
    { bookingId: record.id, actorUid: options.uid ?? "student-1" },
    {
      store,
      refundPayment,
      reverseCommission: options.reverseCommission ?? vi.fn(async () => undefined),
      now: () => options.now ?? NOW,
    },
  );
  return { result, store, refundPayment };
}

describe("cancellation policy", () => {
  it("A. lets a student cancel more than 24 hours before the lesson with a refund", () => {
    expect(
      decideCancellation({
        status: "confirmed",
        paymentStatus: "paid",
        scheduledAt: IN_THREE_DAYS,
        actor: "student",
        now: NOW,
      }),
    ).toEqual({ canCancel: true, willRefund: true, reason: "free_window_refund" });
  });

  it("B. blocks a student from cancelling less than 24 hours before a paid lesson", () => {
    expect(
      decideCancellation({
        status: "confirmed",
        paymentStatus: "paid",
        scheduledAt: IN_TWELVE_HOURS,
        actor: "student",
        now: NOW,
      }),
    ).toEqual({ canCancel: false, willRefund: false, reason: "late_student" });
  });

  it("C. lets a tutor cancel even less than 24 hours before, with a refund if paid", () => {
    expect(
      decideCancellation({
        status: "confirmed",
        paymentStatus: "paid",
        scheduledAt: IN_TWELVE_HOURS,
        actor: "tutor",
        now: NOW,
      }),
    ).toEqual({ canCancel: true, willRefund: true, reason: "tutor_refund" });
  });

  it("D. lets a student cancel an unpaid booking without a refund", () => {
    expect(
      decideCancellation({
        status: "pending",
        paymentStatus: "unpaid",
        scheduledAt: IN_TWELVE_HOURS,
        actor: "student",
        now: NOW,
      }),
    ).toEqual({ canCancel: true, willRefund: false, reason: "unpaid" });
  });

  it("G/H. does not reopen cancelled or completed bookings", () => {
    expect(
      decideCancellation({
        status: "cancelled",
        paymentStatus: "paid",
        scheduledAt: IN_THREE_DAYS,
        actor: "student",
        now: NOW,
      }).reason,
    ).toBe("already_cancelled");
    expect(
      decideCancellation({
        status: "completed",
        paymentStatus: "paid",
        scheduledAt: IN_THREE_DAYS,
        actor: "student",
        now: NOW,
      }).reason,
    ).toBe("already_completed");
  });

  it("derives the actor from ownership, never from a client-supplied role", () => {
    expect(resolveCancelActor(booking(), "student-1")).toBe("student");
    expect(resolveCancelActor(booking(), "tutor-1")).toBe("tutor");
    expect(() => resolveCancelActor(booking(), "student-2")).toThrow(CancelBookingError);
    expect(() => resolveCancelActor(booking(), "tutor-2")).toThrow(CancelBookingError);
  });

  it("never records a refund larger than the amount paid", () => {
    expect(capRefundAmount(80, 120)).toBe(80);
    expect(capRefundAmount(80, 50)).toBe(50);
    expect(capRefundAmount(80)).toBe(80);
  });

  it("keeps Brazilian Portuguese copy in one place", () => {
    const { copy } = describeCancellation(
      booking({ scheduledAt: IN_THREE_DAYS }),
      "student",
      "R$ 80",
      NOW,
    );
    expect(copy.confirmLabel).toBe("Cancelar e reembolsar");
    expect(copy.amountNote).toMatch(/R\$ 80/);
  });
});

describe("executeCancelBooking", () => {
  it("A. refunds a student who cancels more than 24 hours before the lesson", async () => {
    const { result, store, refundPayment } = await cancel(booking());

    expect(result.refunded).toBe(true);
    expect(result.refundId).toBe("E123");
    expect(result.refundAmount).toBe(80);
    expect(refundPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "pay_080225913252",
        bookingId: "booking-123",
        amount: 80,
      }),
    );
    expect(store.bookings.get("booking-123")).toMatchObject({
      status: "cancelled",
      paymentStatus: "refunded",
      refundStatus: "refunded",
      refundAmount: 80,
    });
  });

  it("B. does not cancel or refund when the student is inside 24 hours", async () => {
    const refundPayment = vi.fn(async () => successfulRefund());
    await expect(
      cancel(booking({ scheduledAt: IN_TWELVE_HOURS }), { refundPayment }),
    ).rejects.toMatchObject({
      code: "late_student",
      message: expect.stringMatching(/24 horas/),
    });
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it("C. refunds when the tutor cancels a paid booking", async () => {
    const { result, store } = await cancel(booking({ scheduledAt: IN_TWELVE_HOURS }), {
      uid: "tutor-1",
    });

    expect(result.refunded).toBe(true);
    expect(store.bookings.get("booking-123")?.status).toBe("cancelled");
  });

  it("D. cancels an unpaid student booking without calling Asaas", async () => {
    const { result, store, refundPayment } = await cancel(
      booking({
        status: "pending",
        paymentStatus: "unpaid",
        paymentId: undefined,
      }),
    );

    expect(result.refunded).toBe(false);
    expect(refundPayment).not.toHaveBeenCalled();
    expect(store.bookings.get("booking-123")?.status).toBe("cancelled");
    expect(store.bookings.get("booking-123")?.refundId).toBeUndefined();
  });

  it("E. refunds a paid booking cancelled by the student", async () => {
    const { result, store } = await cancel(booking({ status: "confirmed", paymentStatus: "paid" }));
    expect(result.refunded).toBe(true);
    expect(result.refundAmount).toBe(80);
    expect(store.bookings.get("booking-123")).toMatchObject({
      status: "cancelled",
      paymentStatus: "refunded",
    });
  });

  it("F. refunds a paid booking cancelled by the tutor", async () => {
    const { result, refundPayment } = await cancel(booking(), { uid: "tutor-1" });
    expect(result.refunded).toBe(true);
    expect(refundPayment).toHaveBeenCalledTimes(1);
  });

  it("G. does not refund again when the booking is already cancelled", async () => {
    const refundPayment = vi.fn(async () => successfulRefund());
    await expect(
      cancel(
        booking({
          status: "cancelled",
          refundId: "E-old",
          refundStatus: "REFUNDED",
          refundAmount: 80,
        }),
        { refundPayment },
      ),
    ).rejects.toMatchObject({ code: "already_cancelled" });
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it("H. does not cancel a completed lesson", async () => {
    const refundPayment = vi.fn(async () => successfulRefund());
    await expect(
      cancel(booking({ status: "completed" }), { refundPayment }),
    ).rejects.toMatchObject({ code: "not_cancellable", message: CANCEL_ERRORS.notCancellable });
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it("I. does not call Asaas again when a refund was already issued", async () => {
    const refundPayment = vi.fn(async () => successfulRefund());
    const { result, store } = await cancel(
      booking({
        refundId: "E-existing",
        refundStatus: "REFUNDED",
        refundAmount: 80,
      }),
      { refundPayment },
    );

    expect(result).toMatchObject({
      refunded: true,
      refundId: "E-existing",
    });
    expect(refundPayment).not.toHaveBeenCalled();
    expect(store.bookings.get("booking-123")?.status).toBe("cancelled");
  });

  it("J. does not cancel the booking when the Asaas refund fails", async () => {
    const store = createMemoryCancelStore(new Map([["booking-123", booking()]]));
    const refundPayment = vi.fn(async () => {
      throw new Error("Não foi possível estornar o pagamento no Asaas (400).");
    });

    await expect(
      executeCancelBooking(
        { bookingId: "booking-123", actorUid: "student-1" },
        { store, refundPayment, now: () => NOW },
      ),
    ).rejects.toMatchObject({ code: "refund_failed" });

    expect(store.bookings.get("booking-123")?.status).toBe("confirmed");
    expect(store.bookings.get("booking-123")?.refundId).toBeUndefined();
    expect(store.bookings.get("booking-123")?.refundStatus).toBeUndefined();
  });

  it("K. does not cancel the booking when the Asaas refund times out", async () => {
    const store = createMemoryCancelStore(new Map([["booking-123", booking()]]));
    const refundPayment = vi.fn(async () => {
      throw new Error(
        "O estorno no Asaas excedeu o tempo limite. Nenhum cancelamento foi concluído. Tente novamente.",
      );
    });

    await expect(
      executeCancelBooking(
        { bookingId: "booking-123", actorUid: "student-1" },
        { store, refundPayment, now: () => NOW },
      ),
    ).rejects.toMatchObject({ code: "refund_timeout", httpStatus: 504 });

    expect(store.bookings.get("booking-123")?.status).toBe("confirmed");
    expect(store.bookings.get("booking-123")?.refundStatus).toBeUndefined();
  });

  it("L. refunds only once when the cancellation is submitted twice", async () => {
    const store = createMemoryCancelStore(new Map([["booking-123", booking()]]));
    const refundPayment = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return successfulRefund();
    });
    const deps = { store, refundPayment, now: () => NOW };

    const results = await Promise.allSettled([
      executeCancelBooking({ bookingId: "booking-123", actorUid: "student-1" }, deps),
      executeCancelBooking({ bookingId: "booking-123", actorUid: "student-1" }, deps),
    ]);

    const fulfilled = results.filter((item) => item.status === "fulfilled");
    const rejected = results.filter((item) => item.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(refundPayment).toHaveBeenCalledTimes(1);
    expect(store.bookings.get("booking-123")).toMatchObject({
      status: "cancelled",
      refundId: "E123",
      refundAmount: 80,
    });
  });

  it("never lets a student cancel another student's booking", async () => {
    await expect(cancel(booking(), { uid: "student-2" })).rejects.toMatchObject({
      code: "forbidden",
      message: CANCEL_ERRORS.forbidden,
    });
  });

  it("never lets a tutor cancel another tutor's booking", async () => {
    await expect(cancel(booking(), { uid: "tutor-2" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("reverses facilitator commission after a successful refund", async () => {
    const reverseCommission = vi.fn(async () => undefined);
    await cancel(booking(), { reverseCommission });
    expect(reverseCommission).toHaveBeenCalledWith("booking-123");
  });

  it("caps the recorded refund when the gateway returns more than the amount paid", async () => {
    const refundPayment = vi.fn(async () => ({
      paymentId: "pay_080225913252",
      status: "refunded" as const,
      refundId: "E123",
      refundAmount: 999,
    }));
    const { result } = await cancel(booking(), { refundPayment });
    expect(result.refundAmount).toBe(80);
  });

  it("releases a collective hub seat when cancelling an unpaid booking", async () => {
    const hubReleases: Array<{ hubId: string; studentId: string }> = [];
    const store = createMemoryCancelStore(
      new Map([
        [
          "booking-collective",
          booking({
            id: "booking-collective",
            type: "coletivo",
            hubId: "hub-1",
            status: "pending",
            paymentStatus: "unpaid",
            scheduledAt: IN_THREE_DAYS,
          }),
        ],
      ]),
      { hubReleases },
    );

    await executeCancelBooking(
      { bookingId: "booking-collective", actorUid: "student-1" },
      {
        store,
        refundPayment: vi.fn(),
        now: () => NOW,
      },
    );

    expect(hubReleases).toEqual([{ hubId: "hub-1", studentId: "student-1" }]);
    expect(store.bookings.get("booking-collective")?.status).toBe("cancelled");
  });
});
