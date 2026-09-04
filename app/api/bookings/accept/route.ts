import { NextResponse } from "next/server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { acceptBookingAsTutor } from "@/lib/bookings/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function errorHttpStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Token") || message.includes("autenticação") || message.includes("login")) {
    return 401;
  }
  if (message.includes("Apenas o professor")) {
    return 403;
  }
  if (message.includes("não encontrada")) {
    return 404;
  }
  if (
    message.includes("já foi aceita") ||
    message.includes("já foi paga") ||
    message.includes("cancelada") ||
    message.includes("pendentes")
  ) {
    return 409;
  }
  if (message.includes("Firebase Admin")) {
    return 503;
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

    const result = await acceptBookingAsTutor({
      bookingId,
      actorUid: uid,
    });

    return NextResponse.json({
      ok: true,
      bookingId: result.bookingId,
      paymentStatus: result.paymentStatus,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível aceitar a reserva.";
    return NextResponse.json({ error: message }, { status: errorHttpStatus(error) });
  }
}
