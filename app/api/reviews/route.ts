import { NextResponse } from "next/server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { statusFromCreateReviewError } from "@/lib/reviews/create-review";
import { createStudentReview } from "@/lib/reviews/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
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
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar a avaliação.";
    return NextResponse.json(
      { error: message },
      { status: statusFromCreateReviewError(error) },
    );
  }
}
