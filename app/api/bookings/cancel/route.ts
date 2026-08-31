import { NextResponse } from "next/server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { CancelBookingError } from "@/lib/bookings/cancellation";
import { cancelBookingWithRefund } from "@/lib/bookings/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function errorHttpStatus(error: unknown): number {
  if (error instanceof CancelBookingError) {
    return error.httpStatus;
  }
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Token") || message.includes("autenticação") || message.includes("login")) {
    return 401;
  }
  if (message.includes("não pode cancelar") || message.includes("só pode")) {
    return 403;
  }
  if (message.includes("não encontrada")) {
    return 404;
  }
  if (
    message.includes("24 horas") ||
    message.includes("já está cancelada") ||
    message.includes("não pode ser cancelada") ||
    message.includes("já está em andamento")
  ) {
    return 409;
  }
  if (message.includes("tempo limite")) {
    return 504;
  }
  if (message.includes("ASAAS_API_KEY") || message.includes("Firebase Admin")) {
    return 503;
  }
  if (message.includes("Asaas") || message.includes("estornar")) {
    return 502;
  }
  return 400;
}

export async function POST(request: Request) {
  try {
    const { uid } = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as {
      bookingId?: string;
    };

    const bookingId = body.bookingId?.trim();

    if (!bookingId) {
      return NextResponse.json({ error: "Informe o identificador da reserva." }, { status: 400 });
    }

    const result = await cancelBookingWithRefund({
      bookingId,
      actorUid: uid,
    });

    return NextResponse.json({
      ok: true,
      bookingId: result.bookingId,
      refunded: result.refunded,
      refundId: result.refundId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível cancelar a reserva.";
    return NextResponse.json({ error: message }, { status: errorHttpStatus(error) });
  }
}
