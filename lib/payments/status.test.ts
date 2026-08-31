import { describe, expect, it } from "vitest";
import {
  canStartCheckout,
  getPaymentLifecycle,
  getStudentPaymentCopy,
  getTutorPaymentCopy,
  hasTutorRequestedPayment,
  isLessonUnlocked,
} from "@/lib/payments/status";

describe("payment lifecycle", () => {
  it("distinguishes not started, checkout created, awaiting payment, failed, expired and paid", () => {
    expect(getPaymentLifecycle({ paymentStatus: "unpaid" })).toBe("not_started");
    expect(getPaymentLifecycle({ paymentStatus: "awaiting_payment" })).toBe("awaiting_payment");
    expect(
      getPaymentLifecycle({
        paymentStatus: "awaiting_payment",
        asaasCheckoutId: "checkout-abc",
      }),
    ).toBe("checkout_created");
    expect(getPaymentLifecycle({ paymentStatus: "failed" })).toBe("failed");
    expect(getPaymentLifecycle({ paymentStatus: "expired" })).toBe("expired");
    expect(getPaymentLifecycle({ paymentStatus: "paid" })).toBe("paid");
  });

  it("lets the student retry after a failed or expired checkout without unlocking the lesson", () => {
    expect(canStartCheckout({ status: "pending", paymentStatus: "failed" })).toBe(true);
    expect(canStartCheckout({ status: "pending", paymentStatus: "expired" })).toBe(true);
    expect(canStartCheckout({ status: "pending", paymentStatus: "awaiting_payment" })).toBe(true);
    expect(canStartCheckout({ status: "pending", paymentStatus: "unpaid" })).toBe(false);
    expect(canStartCheckout({ status: "confirmed", paymentStatus: "paid" })).toBe(false);
    expect(
      isLessonUnlocked({
        status: "pending",
        paymentStatus: "failed",
        meetingUrl: "https://meet.jit.si/aprendizbay-booking-123",
      }),
    ).toBe(false);
  });

  it("gives the student a Portuguese explanation and retry action", () => {
    expect(getStudentPaymentCopy("failed")).toEqual({
      explanation:
        "O pagamento não foi aprovado. Nenhum valor foi confirmado e a aula ainda não foi liberada.",
      actionLabel: "Tentar pagamento novamente",
    });
    expect(getStudentPaymentCopy("expired").actionLabel).toBe("Tentar pagamento novamente");
    expect(getStudentPaymentCopy("expired").explanation).toMatch(/expirou ou foi cancelado/);
  });

  it("does not tell the tutor that an unpaid checkout is complete", () => {
    expect(hasTutorRequestedPayment("failed")).toBe(true);
    expect(hasTutorRequestedPayment("expired")).toBe(true);
    expect(getTutorPaymentCopy("failed")?.explanation).toMatch(/ainda não está confirmada/);
    expect(getTutorPaymentCopy("expired")?.explanation).toMatch(/nenhum pagamento foi concluído/i);
    expect(getTutorPaymentCopy("paid")).toBeNull();
  });

  it("unlocks the lesson only after a confirmed paid booking with a meeting URL", () => {
    expect(
      isLessonUnlocked({
        status: "confirmed",
        paymentStatus: "paid",
        meetingUrl: "https://meet.jit.si/aprendizbay-booking-123",
      }),
    ).toBe(true);
    expect(
      isLessonUnlocked({
        status: "confirmed",
        paymentStatus: "failed",
        meetingUrl: "https://meet.jit.si/aprendizbay-booking-123",
      }),
    ).toBe(false);
  });
});
