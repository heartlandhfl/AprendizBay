import type { Timestamp } from "firebase/firestore";

export type BookingType = "individual" | "coletivo";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type PaymentStatus = "unpaid" | "awaiting_payment" | "paid" | "failed";

export interface Booking {
  id: string;
  studentId: string;
  tutorId: string;
  hubId?: string;
  type: BookingType;
  status: BookingStatus;
  price: number;
  platformFee?: number;
  tutorAmount?: number;
  scheduledAt: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  meetingUrl?: string;
  paymentStatus?: PaymentStatus;
  paymentId?: string;
  asaasCheckoutId?: string;
  refundId?: string;
  refundStatus?: string;
  refundAmount?: number;
}

export interface CreateBookingInput {
  tutorId: string;
  type: BookingType;
  price: number;
  platformFee?: number;
  tutorAmount?: number;
  hubId?: string;
  scheduledAt: Date;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Concluída",
};

export const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  individual: "Individual",
  coletivo: "Coletiva",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Aguardando professor",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  failed: "Pagamento falhou",
};

export const BOOKING_FEE_LABELS = {
  lesson: "Valor da aula",
  tutor: "Valor do professor",
  platform: "Taxa da plataforma",
  total: "Total a pagar",
} as const;
