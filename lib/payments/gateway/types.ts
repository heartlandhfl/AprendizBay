/**
 * Provider-agnostic payment types. Gateway implementations translate
 * provider-specific values into these shapes before returning.
 */

export type PaymentStatus =
  | "unpaid"
  | "checkout_created"
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "expired";

export type PaymentProvider = "asaas" | "mercadopago" | "infinitepay";

export interface CheckoutCustomerInput {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  address?: string;
  addressNumber?: string;
  postalCode?: string;
  province?: string;
}

export interface CreateCheckoutInput {
  bookingId: string;
  itemName: string;
  itemDescription?: string;
  amount: number;
  customer: CheckoutCustomerInput;
  successUrl: string;
  cancelUrl: string;
  expiredUrl?: string;
  notificationUrl?: string;
  minutesToExpire?: number;
}

export interface CreateCheckoutResult {
  checkoutId: string;
  checkoutUrl: string;
  status: PaymentStatus;
}

export interface PaymentStatusResult {
  paymentId: string;
  status: PaymentStatus;
  bookingId?: string;
  amount?: number;
  checkoutId?: string;
}

export interface RefundInput {
  paymentId: string;
  description?: string;
  amount?: number;
}

export interface RefundResult {
  paymentId: string;
  status: PaymentStatus;
  refundId?: string;
  refundAmount?: number;
}

export type WebhookEventKind = "payment_update" | "ignored";

export interface WebhookEvent {
  kind: WebhookEventKind;
  status: PaymentStatus;
  bookingId?: string;
  paymentId?: string;
  checkoutId?: string;
  paidAmount?: number;
}

export type VerifyWebhookResult =
  | { ok: false; httpStatus: 401 | 503; error: string }
  | { ok: true; event: WebhookEvent };

export interface PaymentGateway {
  readonly provider: PaymentProvider;

  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;

  getPaymentStatus(paymentId: string): Promise<PaymentStatusResult>;

  refund(input: RefundInput): Promise<RefundResult>;

  verifyWebhook(request: Request): Promise<VerifyWebhookResult>;
}
