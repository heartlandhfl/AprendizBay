import { NextResponse } from "next/server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { logCriticalServerFailure } from "@/lib/observability/server-log";
import { statusFromCreateReviewError } from "@/lib/reviews/create-review";
import { createStudentReview, listPublicTutorReviews } from "@/lib/reviews/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Public tutor reviews without student identifiers (marketplace profile pages).
 */
export async function GET(request: Request) {
  const tutorId = new URL(request.url).searchParams.get("tutorId")?.trim() ?? "";
  if (!tutorId) {
    return NextResponse.json({ error: "Informe o identificador do professor." }, { status: 400 });
  }

  try {
    const reviews = await listPublicTutorReviews(tutorId);
    return NextResponse.json({ ok: true, reviews });
  } catch (error) {
    logCriticalServerFailure("review", "Failed to list public tutor reviews", {
      tutorId,
    });
    const message =
      error instanceof Error ? error.message : "Não foi possível carregar as avaliações.";
    const status = message.includes("Firebase Admin") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * Vercel / next start counterpart to POST /api/reviews
 * (server/api/reviews.js on Hostinger Express). Same contract so the
 * client can call one URL on either host.
 */
export async function POST(request: Request) {
  try {
    const { uid } = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as {
      bookingId?: string;
      tutorId?: string;
      rating?: number;
      comment?: string;
      studentId?: string;
    };

    const result = await createStudentReview({
      actorUid: uid,
      bookingId: body.bookingId ?? "",
      tutorId: body.tutorId ?? "",
      rating: body.rating as number,
      comment: body.comment ?? "",
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logCriticalServerFailure("review", "Failed to create student review");
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar a avaliação.";
    return NextResponse.json(
      { error: message },
      { status: statusFromCreateReviewError(error) },
    );
  }
}
