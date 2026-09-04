import { NextResponse } from "next/server";
import { assertStudentApiActor, getUserProfile, verifyUserIdToken } from "@/lib/auth/admin-server";
import { statusFromCreateBookingError } from "@/lib/bookings/create-booking";
import { createIndividualBookingAsStudent } from "@/lib/bookings/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Vercel / next start counterpart to POST /api/bookings
 * (server/api/bookings.js on Hostinger Express). Authoritative
 * individual-slot check runs in a Firestore transaction immediately
 * before the booking is committed.
 */
export async function POST(request: Request) {
  try {
    const { uid, customClaims } = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as {
      tutorId?: string;
      type?: string;
      scheduledAt?: string;
    };
    const profile = await getUserProfile(uid);
    assertStudentApiActor(customClaims, profile?.role);

    const result = await createIndividualBookingAsStudent({
      actorUid: uid,
      actorRole: profile?.role,
      tutorId: body.tutorId,
      type: body.type,
      scheduledAt: body.scheduledAt,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível criar a reserva.";
    const status =
      message.includes("Apenas alunos")
        ? 403
        : statusFromCreateBookingError(error);
    return NextResponse.json(
      {
        error: message,
        code: error && typeof error === "object" && "code" in error ? error.code : undefined,
      },
      { status },
    );
  }
}
