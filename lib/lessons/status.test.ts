import { describe, expect, it } from "vitest";
import { getLessonStatus, LESSON_STATUS_LABELS } from "@/lib/lessons/status";

describe("getLessonStatus", () => {
  it("maps booking and payment state to the five Portuguese statuses", () => {
    expect(getLessonStatus({ status: "pending", paymentStatus: "unpaid" })).toBe("scheduled");
    expect(getLessonStatus({ status: "pending", paymentStatus: "awaiting_payment" })).toBe(
      "payment_pending",
    );
    expect(getLessonStatus({ status: "pending", paymentStatus: "failed" })).toBe(
      "payment_pending",
    );
    expect(getLessonStatus({ status: "pending", paymentStatus: "expired" })).toBe(
      "payment_pending",
    );
    expect(getLessonStatus({ status: "confirmed", paymentStatus: "paid" })).toBe("confirmed");
    expect(getLessonStatus({ status: "completed", paymentStatus: "paid" })).toBe("completed");
    expect(getLessonStatus({ status: "cancelled", paymentStatus: "paid" })).toBe("cancelled");
  });

  it("exposes Brazilian Portuguese labels", () => {
    expect(LESSON_STATUS_LABELS).toEqual({
      scheduled: "Agendada",
      payment_pending: "Pagamento pendente",
      confirmed: "Confirmada",
      completed: "Concluída",
      cancelled: "Cancelada",
    });
  });
});
