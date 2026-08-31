import type { BookingStatus, PaymentStatus } from "@/lib/bookings/types";

export type LessonStatus =
  | "scheduled"
  | "payment_pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  scheduled: "Agendada",
  payment_pending: "Pagamento pendente",
  confirmed: "Confirmada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const PENDING_PAYMENT_STATUSES = new Set<PaymentStatus>([
  "awaiting_payment",
  "failed",
  "expired",
]);

export function getLessonStatus(booking: {
  status?: BookingStatus | string;
  paymentStatus?: PaymentStatus | string;
}): LessonStatus {
  if (booking.status === "cancelled") {
    return "cancelled";
  }
  if (booking.status === "completed") {
    return "completed";
  }
  if (booking.status === "confirmed") {
    return "confirmed";
  }
  if (PENDING_PAYMENT_STATUSES.has(booking.paymentStatus as PaymentStatus)) {
    return "payment_pending";
  }
  return "scheduled";
}
