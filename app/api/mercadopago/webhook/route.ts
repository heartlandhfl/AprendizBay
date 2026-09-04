import { handleMercadoPagoWebhookRequest, mercadoPagoWebhookHealthResponse } from "@/lib/payments/handle-mercadopago-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy Mercado Pago webhook alias.
 * Prefer POST /api/payments/webhook/mercadopago (registered by checkout flows).
 */
export async function POST(request: Request) {
  return handleMercadoPagoWebhookRequest(request, { logVerificationFailures: true });
}

export async function GET() {
  return mercadoPagoWebhookHealthResponse();
}
