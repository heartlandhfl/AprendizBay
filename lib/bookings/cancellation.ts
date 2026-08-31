import type { BookingStatus, PaymentStatus } from "@/lib/bookings/types";

/**
 * Política de cancelamento (fonte única da verdade).
 *
 * - Aluno, reserva não paga: pode cancelar, sem estorno.
 * - Aluno, reserva paga, 24h ou mais antes da aula: pode cancelar com estorno
 *   integral do valor pago (`price`).
 * - Aluno, reserva paga, menos de 24h: não pode cancelar e não há estorno.
 * - Professor, reserva paga: pode cancelar com estorno integral ao aluno,
 *   inclusive a menos de 24h.
 * - Professor, reserva não paga: pode cancelar, sem estorno.
 * - Reserva já cancelada ou aula já concluída: não pode cancelar.
 * - O estorno nunca é maior do que o valor pago.
 * - Só `paymentStatus === "paid"` conta como pago; falha/expirado/aguardando
 *   seguem a regra de não pago.
 *
 * O papel (aluno/professor) é resolvido no servidor a partir do uid
 * autenticado versus `studentId`/`tutorId`. O campo `actor` enviado pelo
 * navegador não autoriza nada.
 */
export const FREE_CANCELLATION_HOURS = 24;

export const REFUND_CLAIM_STATUS = "REFUND_IN_PROGRESS";
export const REFUND_CLAIM_MS = 45_000;

export const RECORDED_REFUND_STATUSES = new Set([
  "REFUNDED",
  "REFUND_REQUESTED",
  "DONE",
]);

export type CancelActor = "student" | "tutor";

export type CancellationReason =
  | "unpaid"
  | "free_window_refund"
  | "late_student"
  | "tutor_refund"
  | "already_cancelled"
  | "already_completed"
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

export type CancelBookingErrorCode =
  | "not_found"
  | "forbidden"
  | "late_student"
  | "already_cancelled"
  | "not_cancellable"
  | "in_progress"
  | "refund_failed"
  | "refund_timeout"
  | "missing_payment";

export class CancelBookingError extends Error {
  readonly code: CancelBookingErrorCode;
  readonly httpStatus: number;

  constructor(code: CancelBookingErrorCode, httpStatus: number, message: string) {
    super(message);
    this.name = "CancelBookingError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export const CANCEL_ERRORS = {
  notFound: "Reserva não encontrada.",
  forbidden: "Você não pode cancelar esta reserva.",
  alreadyCancelled: "Esta reserva já está cancelada.",
  notCancellable: "Esta reserva não pode ser cancelada.",
  inProgress: "O cancelamento já está em andamento. Aguarde a confirmação do estorno.",
  missingPayment:
    "Não foi possível estornar: o identificador do pagamento no Asaas está ausente.",
  refundFailed: "O Asaas não confirmou o estorno do pagamento. A reserva não foi cancelada.",
  refundTimeout:
    "O estorno no Asaas excedeu o tempo limite. Nenhum cancelamento foi concluído. Tente novamente.",
} as const;

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

  if (input.status === "completed") {
    return { canCancel: false, willRefund: false, reason: "already_completed" };
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
        amountNote: `O valor pago de ${formattedPrice} será estornado integralmente pelo Asaas.`,
        confirmLabel: "Cancelar e reembolsar",
      };
    case "tutor_refund":
      return {
        title: "Cancelar aula paga",
        description: "Como a aula já foi paga, o aluno não deve perder o valor.",
        amountNote: `O aluno receberá estorno integral de ${formattedPrice} pelo Asaas.`,
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
    case "already_completed":
      return {
        title: "Aula já concluída",
        description: "Aulas concluídas não podem ser canceladas.",
        amountNote: "O valor pago, se houver, permanece como está.",
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

export function describeCancellation(
  booking: {
    status: BookingStatus;
    paymentStatus?: PaymentStatus;
    scheduledAt: unknown;
  },
  actor: CancelActor,
  formattedPrice: string,
  now?: Date,
): { decision: CancellationDecision; copy: CancellationCopy } {
  const decision = decideCancellation({
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    scheduledAt: toScheduledDate(booking.scheduledAt),
    actor,
    now,
  });
  return { decision, copy: getCancellationCopy(decision, formattedPrice) };
}

export function lateStudentCancellationError(): string {
  return "O cancelamento gratuito só é permitido até 24 horas antes da aula. O valor pago não será reembolsado.";
}

export function resolveCancelActor(
  booking: { studentId: string; tutorId: string },
  uid: string,
): CancelActor {
  if (booking.studentId === uid) {
    return "student";
  }
  if (booking.tutorId === uid) {
    return "tutor";
  }
  throw new CancelBookingError("forbidden", 403, CANCEL_ERRORS.forbidden);
}

export function hasRecordedRefund(booking: {
  refundId?: string;
  refundStatus?: string;
}): boolean {
  if (booking.refundId?.trim()) {
    return true;
  }
  const status = booking.refundStatus?.trim().toUpperCase();
  return Boolean(status && RECORDED_REFUND_STATUSES.has(status));
}

export function isRefundClaimActive(
  booking: { refundId?: string; refundStatus?: string; refundLockUntil?: Date },
  now: Date,
): boolean {
  if (booking.refundId?.trim()) {
    return false;
  }
  if (booking.refundStatus !== REFUND_CLAIM_STATUS) {
    return false;
  }
  if (!booking.refundLockUntil) {
    return true;
  }
  return booking.refundLockUntil.getTime() > now.getTime();
}

export function capRefundAmount(paidAmount: number, asaasAmount?: number): number {
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw new CancelBookingError("refund_failed", 400, CANCEL_ERRORS.refundFailed);
  }
  if (typeof asaasAmount === "number" && Number.isFinite(asaasAmount) && asaasAmount > 0) {
    return Math.min(asaasAmount, paidAmount);
  }
  return paidAmount;
}

export function rejectionError(decision: CancellationDecision): CancelBookingError {
  if (decision.reason === "late_student") {
    return new CancelBookingError("late_student", 409, lateStudentCancellationError());
  }
  if (decision.reason === "already_cancelled") {
    return new CancelBookingError("already_cancelled", 409, CANCEL_ERRORS.alreadyCancelled);
  }
  return new CancelBookingError("not_cancellable", 409, CANCEL_ERRORS.notCancellable);
}
