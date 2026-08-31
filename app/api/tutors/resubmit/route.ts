import { NextResponse } from "next/server";
import { getUserProfile, verifyUserIdToken } from "@/lib/auth/admin-server";
import { resubmitTutorVerification } from "@/lib/tutors/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Vercel / next start counterpart to POST /api/tutors/resubmit
 * (server/api/tutors.js on Hostinger Express).
 */
export async function POST(request: Request) {
  try {
    const { uid } = await verifyUserIdToken(readBearerToken(request));
    const profile = await getUserProfile(uid);

    if (profile?.role !== "tutor") {
      return NextResponse.json(
        { error: "Apenas professores podem reenviar a verificação." },
        { status: 403 },
      );
    }

    const result = await resubmitTutorVerification(uid);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : undefined;
    const message =
      error instanceof Error ? error.message : "Não foi possível reenviar a verificação.";
    const status =
      code === "INVALID_TRANSITION" || code === "INVALID_TUTOR"
        ? 400
        : code === "NOT_FOUND"
          ? 404
          : message.includes("Token") || message.includes("autenticação")
            ? 401
            : message.includes("Firebase Admin")
              ? 503
              : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
