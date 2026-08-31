import { NextResponse } from "next/server";
import { verifyAdminIdToken } from "@/lib/auth/admin-server";
import { reviewTutorVerification } from "@/lib/tutors/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function statusFromError(error: unknown): number {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : undefined;
  const message = error instanceof Error ? error.message : "";

  if (code === "FORBIDDEN" || message.includes("administradores") || code === "SELF_REVIEW") {
    return 403;
  }
  if (code === "NOT_FOUND") {
    return 404;
  }
  if (
    code === "INVALID_ACTION" ||
    code === "INVALID_TRANSITION" ||
    code === "REASON_REQUIRED" ||
    code === "INVALID_TUTOR"
  ) {
    return 400;
  }
  if (message.includes("Token") || message.includes("autenticação")) {
    return 401;
  }
  if (message.includes("Firebase Admin")) {
    return 503;
  }
  return 500;
}

/**
 * Vercel / next start counterpart to POST /api/tutors/review
 * (server/api/tutors.js on Hostinger Express).
 */
export async function POST(request: Request) {
  try {
    const adminUid = await verifyAdminIdToken(readBearerToken(request));
    const body = (await request.json()) as {
      tutorId?: string;
      action?: string;
      reason?: string;
    };

    const result = await reviewTutorVerification(
      body.tutorId ?? "",
      adminUid,
      body.action ?? "",
      body.reason,
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível atualizar a verificação.";
    return NextResponse.json({ error: message }, { status: statusFromError(error) });
  }
}
