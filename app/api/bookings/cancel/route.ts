import { NextResponse } from "next/server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { cancelBookingWithRefund } from "@/lib/bookings/server";
import type { CancelActor } from "@/lib/bookings/cancellation";

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
      actor?: CancelActor;
    };

    const bookingId = body.bookingId?.trim();
    const actor = body.actor;

    if (!bookingId) {
      return NextResponse.json({ error: "Informe o identificador da reserva." }, { status: 400 });
    }

    if (actor !== "student" && actor !== "tutor") {
      return NextResponse.json({ error: "Informe se o cancelamento é do aluno ou do professor." }, { status: 400 });
    }

    const result = await cancelBookingWithRefund({
      bookingId,
      actorUid: uid,
      actor,
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
    const status =
      message.includes("Token") || message.includes("autenticação") || message.includes("login")
        ? 401
        : message.includes("só pode")
          ? 403
          : message.includes("não encontrada")
            ? 404
            : message.includes("24 horas") ||
                message.includes("já está cancelada") ||
                message.includes("não pode ser cancelada")
              ? 409
              : message.includes("MERCADO_PAGO") || message.includes("Firebase Admin")
                ? 503
                : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
