import {
  handleInfinitePayWebhookRequest,
  infinitePayWebhookHealthResponse,
} from "@/lib/payments/handle-infinitepay-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Canonical InfinitePay webhook (payment approved notifications). */
export async function POST(request: Request) {
  return handleInfinitePayWebhookRequest(request, { logVerificationFailures: true });
}

export async function GET() {
  return infinitePayWebhookHealthResponse();
}
