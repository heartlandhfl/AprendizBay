import { NextResponse } from "next/server";

import { buildEmailDiagnosticsPayload } from "@/lib/admin/email-diagnostics";
import { statusFromAdminError } from "@/lib/admin/authorize";
import { verifyAdminIdToken } from "@/lib/auth/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Vercel / next start counterpart to GET /api/admin/email-diagnostics
 * (server/api/admin.js on Hostinger Express).
 */
export async function GET(request: Request) {
  try {
    await verifyAdminIdToken(readBearerToken(request));
    return NextResponse.json(buildEmailDiagnosticsPayload());
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar o diagnóstico de e-mail.";
    return NextResponse.json({ error: message }, { status: statusFromAdminError(error) });
  }
}
