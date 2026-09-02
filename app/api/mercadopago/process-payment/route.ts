import { NextResponse } from "next/server";
import { captureServerException } from "@/lib/observability/sentry-server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import {
  PROCESS_PAYMENT_ERRORS,
  processMercadoPagoBookingPayment,
} from "@/lib/payments/process-mercadopago-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function getSiteUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return new URL(request.url).origin;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function POST(request: Request) {
  try {
    const { uid } = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as {
      bookingId?: string;
      token?: string;
      paymentMethodId?: string;
      payment_method_id?: string;
      installments?: number;
      issuerId?: string;
      issuer_id?: string;
      payer?: {
        email?: string;
        identification?: {
          type?: string;
          number?: string;
        };
      };
      transaction_amount?: unknown;
      price?: unknown;
      platformFee?: unknown;
      tutorAmount?: unknown;
      studentId?: unknown;
      tutorId?: unknown;
      status?: unknown;
    };

    const bookingId = readString(body.bookingId);
    const token = readString(body.token);
    const paymentMethodId =
      readString(body.paymentMethodId) ?? readString(body.payment_method_id);
    const installments = readNumber(body.installments) ?? 1;
    const issuerId = readString(body.issuerId) ?? readString(body.issuer_id);
    const payerEmail = readString(body.payer?.email);
    const payerIdentificationType = readString(body.payer?.identification?.type);
    const payerIdentificationNumber = readString(body.payer?.identification?.number);

    if (!bookingId) {
      return NextResponse.json({ error: "Informe o identificador da reserva." }, { status: 400 });
    }

    const result = await processMercadoPagoBookingPayment({
      uid,
      bookingId,
      token: token ?? "",
      paymentMethodId: paymentMethodId ?? "",
      installments,
      issuerId,
      payerEmail,
      payerIdentificationType,
      payerIdentificationNumber,
      notificationUrl: `${getSiteUrl(request)}/api/mercadopago/webhook`,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      paymentId: result.paymentId,
      status: result.status,
      statusDetail: result.statusDetail,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível processar o pagamento.";
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
        ? PROCESS_PAYMENT_ERRORS.mpMissing
        : status === 400 && !/[áàâãéêíóôõúç]/i.test(message)
          ? "Não foi possível processar o pagamento."
          : message;

    return NextResponse.json({ error: publicMessage }, { status });
  }
}
