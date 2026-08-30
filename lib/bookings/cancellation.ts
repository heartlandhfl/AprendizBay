import type { BookingStatus, PaymentStatus } from "@/lib/bookings/types";

export const FREE_CANCELLATION_HOURS = 24;

export type CancelActor = "student" | "tutor";

export type CancellationReason =
  | "unpaid"
  | "free_window_refund"
  | "late_student"
  | "tutor_refund"
  | "already_cancelled"
  | "not_cancellable";

export interface CancellationDecision {
  canCancel: boolean;
  willRefund: boolean;
  reason: CancellationReason;
}

export interface CancellationCopy {
  title: string;
  description: string;
  amountNote: string;
  confirmLabel: string;
}

export function toScheduledDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as { toDate?: () => Date; toMillis?: () => number };
    if (typeof record.toDate === "function") {
      return record.toDate();
    }
    if (typeof record.toMillis === "function") {
      return new Date(record.toMillis());
    }
  }

  return new Date(NaN);
}

export function isFreeCancellationWindow(scheduledAt: Date, now: Date = new Date()): boolean {
  if (Number.isNaN(scheduledAt.getTime())) {
    return false;
  }

  const windowMs = FREE_CANCELLATION_HOURS * 60 * 60 * 1000;
  return scheduledAt.getTime() - now.getTime() >= windowMs;
}

export function decideCancellation(input: {
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
  scheduledAt: Date;
  actor: CancelActor;
  now?: Date;
}): CancellationDecision {
  if (input.status === "cancelled") {
    return { canCancel: false, willRefund: false, reason: "already_cancelled" };
  }

  if (input.status !== "pending" && input.status !== "confirmed") {
    return { canCancel: false, willRefund: false, reason: "not_cancellable" };
  }

  const paid = input.paymentStatus === "paid";
  if (!paid) {
    return { canCancel: true, willRefund: false, reason: "unpaid" };
  }

  if (input.actor === "tutor") {
    return { canCancel: true, willRefund: true, reason: "tutor_refund" };
  }

  if (isFreeCancellationWindow(input.scheduledAt, input.now)) {
    return { canCancel: true, willRefund: true, reason: "free_window_refund" };
  }

  return { canCancel: false, willRefund: false, reason: "late_student" };
}

export function getCancellationCopy(
  decision: CancellationDecision,
  formattedPrice: string,
): CancellationCopy {
  switch (decision.reason) {
    case "unpaid":
      return {
        title: "Cancelar reserva",
        description: "Nenhum pagamento foi feito nesta aula.",
        amountNote: "Nada será cobrado e nenhum reembolso é necessário.",
        confirmLabel: "Confirmar cancelamento",
      };
    case "free_window_refund":
      return {
        title: "Cancelar e reembolsar",
        description:
          "O cancelamento é gratuito porque falta 24 horas ou mais para a aula.",
        amountNote: `O valor pago de ${formattedPrice} será reembolsado integralmente pelo Mercado Pago.`,
        confirmLabel: "Cancelar e reembolsar",
      };
    case "tutor_refund":
      return {
        title: "Cancelar aula paga",
        description: "Como a aula já foi paga, o aluno não deve perder o valor.",
        amountNote: `O aluno receberá reembolso integral de ${formattedPrice} pelo Mercado Pago.`,
        confirmLabel: "Cancelar e reembolsar o aluno",
      };
    case "late_student":
      return {
        title: "Cancelamento não é gratuito",
        description:
          "Faltam menos de 24 horas para a aula. A política de cancelamento gratuito não se aplica.",
        amountNote: `O valor pago de ${formattedPrice} não será reembolsado.`,
        confirmLabel: "Entendi",
      };
    case "already_cancelled":
      return {
        title: "Reserva já cancelada",
        description: "Esta reserva já está cancelada.",
        amountNote: "Nenhuma nova ação de pagamento será feita.",
        confirmLabel: "Fechar",
      };
    default:
      return {
        title: "Não é possível cancelar",
        description: "Esta reserva não pode ser cancelada neste momento.",
        amountNote: "O valor pago, se houver, permanece como está.",
        confirmLabel: "Fechar",
      };
  }
}

export function lateStudentCancellationError(): string {
  return "O cancelamento gratuito só é permitido até 24 horas antes da aula. O valor pago não será reembolsado.";
}
