import { NextResponse } from "next/server";
import { captureServerException } from "@/lib/observability/sentry-server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { refundBookingPayment } from "@/lib/payments/refund-booking-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function POST(request: Request) {
  try {
    const { uid } = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as {
      bookingId?: string;
      description?: string;
    };

    const bookingId = body.bookingId?.trim();
    if (!bookingId) {
      return NextResponse.json({ error: "Informe o identificador da reserva." }, { status: 400 });
    }

    const result = await refundBookingPayment({
      actorUid: uid,
      bookingId,
      description: body.description?.trim(),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      bookingId: result.bookingId,
      paymentId: result.paymentId,
      refundId: result.refundId,
      refundAmount: result.refundAmount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível estornar o pagamento.";
    const status =
      message.includes("Token") || message.includes("autenticação")
        ? 401
        : message.includes("MERCADOPAGO_ACCESS_TOKEN") || message.includes("Firebase Admin")
          ? 503
          : 400;
    if (status >= 500) {
      captureServerException(error);
    }

    const publicMessage =
      status === 503
        ? "A configuração de pagamento não está disponível."
        : status === 400 && !/[áàâãéêíóôõúç]/i.test(message)
          ? "Não foi possível estornar o pagamento."
          : message;

    return NextResponse.json({ error: publicMessage }, { status });
  }
}
