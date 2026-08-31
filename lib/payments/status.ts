import type { BookingStatus, PaymentStatus } from "@/lib/bookings/types";

export type PaymentLifecycle =
  | "not_started"
  | "awaiting_payment"
  | "checkout_created"
  | "failed"
  | "expired"
  | "paid";

export interface PaymentCopy {
  explanation: string;
  actionLabel?: string;
}

const RETRYABLE_PAYMENT_STATUSES = new Set<PaymentStatus>([
  "awaiting_payment",
  "failed",
  "expired",
]);

export function getPaymentLifecycle(booking: {
  paymentStatus?: PaymentStatus;
  asaasCheckoutId?: string;
}): PaymentLifecycle {
  const paymentStatus = booking.paymentStatus ?? "unpaid";

  if (paymentStatus === "paid") {
    return "paid";
  }
  if (paymentStatus === "failed") {
    return "failed";
  }
  if (paymentStatus === "expired") {
    return "expired";
  }
  if (paymentStatus === "awaiting_payment") {
    return booking.asaasCheckoutId?.trim() ? "checkout_created" : "awaiting_payment";
  }
  return "not_started";
}

export function isRetryablePaymentStatus(paymentStatus?: PaymentStatus): boolean {
  return RETRYABLE_PAYMENT_STATUSES.has(paymentStatus ?? "unpaid");
}

export function canStartCheckout(booking: {
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
}): boolean {
  return booking.status === "pending" && isRetryablePaymentStatus(booking.paymentStatus);
}

export function hasTutorRequestedPayment(paymentStatus?: PaymentStatus): boolean {
  return isRetryablePaymentStatus(paymentStatus);
}

export function isLessonUnlocked(booking: {
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
  meetingUrl?: string;
}): boolean {
  return (
    booking.status === "confirmed" &&
    booking.paymentStatus === "paid" &&
    Boolean(booking.meetingUrl)
  );
}

export function getStudentPaymentCopy(lifecycle: PaymentLifecycle): PaymentCopy {
  switch (lifecycle) {
    case "not_started":
      return {
        explanation:
          "Aguardando o professor confirmar. Depois você poderá pagar para liberar a aula.",
      };
    case "awaiting_payment":
      return {
        explanation: "O professor confirmou. Pague para liberar a aula.",
        actionLabel: "Pagar com Pix ou cartão",
      };
    case "checkout_created":
      return {
        explanation:
          "Há um checkout em aberto. Conclua o pagamento ou gere um novo se o link não funcionar. A aula só será liberada depois da confirmação do Asaas.",
        actionLabel: "Tentar pagamento novamente",
      };
    case "failed":
      return {
        explanation:
          "O pagamento não foi aprovado. Nenhum valor foi confirmado e a aula ainda não foi liberada.",
        actionLabel: "Tentar pagamento novamente",
      };
    case "expired":
      return {
        explanation:
          "O checkout expirou ou foi cancelado. Nenhum pagamento foi confirmado e a aula ainda não foi liberada.",
        actionLabel: "Tentar pagamento novamente",
      };
    case "paid":
      return {
        explanation: "Pagamento confirmado. Sua aula está liberada.",
      };
  }
}

export function getTutorPaymentCopy(lifecycle: PaymentLifecycle): PaymentCopy | null {
  switch (lifecycle) {
    case "awaiting_payment":
    case "checkout_created":
      return {
        explanation:
          "Você aceitou esta aula. O aluno ainda precisa pagar para liberar o link da reunião.",
      };
    case "failed":
      return {
        explanation:
          "O pagamento do aluno falhou. A aula ainda não está confirmada e o link da reunião não foi gerado.",
      };
    case "expired":
      return {
        explanation:
          "O checkout do aluno expirou ou foi cancelado. A aula ainda não está confirmada e nenhum pagamento foi concluído.",
      };
    default:
      return null;
  }
}
