import { NextResponse } from "next/server";
import { statusFromAdminError } from "@/lib/admin/authorize";
import { verifyAdminIdToken } from "@/lib/auth/admin-server";
import { recomputeTutorRating } from "@/lib/reviews/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Vercel / next start counterpart to POST /api/reviews/recompute-rating
 * (server/api/reviews.js on Hostinger Express). Admin-only moderation
 * recalculation. Regular users never recompute another tutor's rating.
 * After a valid review, POST /api/reviews updates the tutor from the booking.
 */
export async function POST(request: Request) {
  try {
    await verifyAdminIdToken(readBearerToken(request));
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
    return NextResponse.json(
      { error: message },
      { status: statusFromAdminError(error) },
    );
  }
}
