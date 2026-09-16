import { AsaasGateway } from "@/lib/payments/gateway/asaas-gateway";
import { MercadoPagoGateway } from "@/lib/payments/gateway/mercadopago-gateway";
import type { PaymentGateway, PaymentProvider } from "@/lib/payments/gateway/types";

const SUPPORTED_PROVIDERS: PaymentProvider[] = ["asaas", "mercadopago"];

export function isPaymentProvider(value: string): value is PaymentProvider {
  return (SUPPORTED_PROVIDERS as string[]).includes(value);
}

/**
 * Reads `PAYMENT_PROVIDER` (`asaas` | `mercadopago`). Defaults to `asaas`
 * when unset or invalid so existing deployments keep working.
 */
export function getPaymentProvider(): PaymentProvider {
  const raw = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (raw && isPaymentProvider(raw)) {
    return raw;
  }
  return "asaas";
}

export function createPaymentGateway(provider?: PaymentProvider): PaymentGateway {
  const resolved = provider ?? getPaymentProvider();
  if (resolved === "mercadopago") {
    return new MercadoPagoGateway();
  }
  return new AsaasGateway();
}
