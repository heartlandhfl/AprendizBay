import { NextResponse } from "next/server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { recomputeTutorRating } from "@/lib/reviews/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Vercel / next start counterpart to POST /api/reviews/recompute-rating
 * (server/api/reviews.js on Hostinger Express). Same contract so the
 * client can call one URL on either host.
 */
export async function POST(request: Request) {
  try {
    await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as { tutorId?: string };
    const tutorId = body.tutorId?.trim() ?? "";
    if (!tutorId) {
      return NextResponse.json(
        { error: "Informe o identificador do professor." },
        { status: 400 },
      );
    }

    await recomputeTutorRating(tutorId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a nota do professor.";
    const status =
      message.includes("Token") || message.includes("autenticação")
        ? 401
        : message.includes("Firebase Admin")
          ? 503
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
