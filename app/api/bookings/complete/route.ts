import { NextResponse } from "next/server";
import { getUserProfile, verifyUserIdToken } from "@/lib/auth/admin-server";
import { statusFromCompleteLessonError } from "@/lib/bookings/complete-lesson";
import { completeLessonAsActor } from "@/lib/bookings/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Vercel / next start counterpart to POST /api/bookings/complete
 * (server/api/bookings.js on Hostinger Express).
 */
export async function POST(request: Request) {
  try {
    const { uid } = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as { bookingId?: string };
    const profile = await getUserProfile(uid);

    const result = await completeLessonAsActor({
      bookingId: body.bookingId ?? "",
      actorUid: uid,
      actorRole: profile?.role,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível marcar a aula como concluída.";
    return NextResponse.json(
      { error: message },
      { status: statusFromCompleteLessonError(error) },
    );
  }
}
