import { createPaymentGateway, getPaymentProvider } from "@/lib/payments/gateway/factory";
import type { PaymentProvider, RefundResult } from "@/lib/payments/gateway/types";
import { findAsaasPaymentIdByExternalReference } from "@/lib/payments/asaas";

export interface RefundViaGatewayInput {
  paymentId?: string;
  bookingId: string;
  description?: string;
  amount?: number;
  provider?: PaymentProvider;
}

export async function refundViaGateway(input: RefundViaGatewayInput): Promise<RefundResult> {
  const provider = input.provider ?? getPaymentProvider();
  const gateway = createPaymentGateway(provider);

  let paymentId = input.paymentId?.trim();
  if (!paymentId && provider === "asaas") {
    paymentId = await findAsaasPaymentIdByExternalReference(input.bookingId);
  }

  if (!paymentId) {
    throw new Error("Não foi possível localizar o pagamento desta reserva.");
  }

  return gateway.refund({
    paymentId,
    description: input.description ?? "Cancelamento da aula no Aprendiz Bay",
    amount: input.amount,
  });
}
