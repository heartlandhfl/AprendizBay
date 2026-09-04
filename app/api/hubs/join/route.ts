import { NextResponse } from "next/server";
import { assertStudentApiActor, getUserProfile, verifyUserIdToken } from "@/lib/auth/admin-server";
import { createCollectiveBookingAsStudent } from "@/lib/bookings/server";
import { statusFromJoinAndBookError } from "@/lib/hubs/join-and-book";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Server-authoritative collective join + booking.
 * The client identifies the turma; price comes from collectiveHubs.currentPrice.
 */
export async function POST(request: Request) {
  try {
    const { uid, customClaims } = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as { hubId?: string };
    const profile = await getUserProfile(uid);
    assertStudentApiActor(customClaims, profile?.role);

    const result = await createCollectiveBookingAsStudent({
      actorUid: uid,
      actorRole: profile?.role,
      hubId: body.hubId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível entrar nesta turma.";
    const status =
      message.includes("Apenas alunos")
        ? 403
        : statusFromJoinAndBookError(error);
    return NextResponse.json(
      {
        error: message,
        code: error && typeof error === "object" && "code" in error ? error.code : undefined,
      },
      { status },
    );
  }
}
