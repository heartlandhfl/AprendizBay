import { NextResponse } from "next/server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { roleFromDecodedToken } from "@/lib/auth/role-server";
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
    const { uid, customClaims } = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as { bookingId?: string };

    const result = await completeLessonAsActor({
      bookingId: body.bookingId ?? "",
      actorUid: uid,
      actorClaimRole: roleFromDecodedToken(customClaims) ?? undefined,
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
