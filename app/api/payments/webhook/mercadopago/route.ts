import { handleMercadoPagoWebhookRequest, mercadoPagoWebhookHealthResponse } from "@/lib/payments/handle-mercadopago-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Canonical Mercado Pago webhook (preferred URL for notificationUrl). */
export async function POST(request: Request) {
  return handleMercadoPagoWebhookRequest(request, { logVerificationFailures: true });
}

export async function GET() {
  return mercadoPagoWebhookHealthResponse();
}
