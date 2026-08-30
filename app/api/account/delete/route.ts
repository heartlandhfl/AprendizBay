import { NextResponse } from "next/server";
import { deleteAuthenticatedAccount } from "@/lib/account/server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Vercel / next start counterpart to POST /api/account/delete
 * (server/api/account.js on Hostinger Express). Same contract so the
 * client can call one URL on either host.
 */
export async function POST(request: Request) {
  try {
    const { uid } = await verifyUserIdToken(readBearerToken(request));
    const summary = await deleteAuthenticatedAccount(uid);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível excluir a conta.";
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : undefined;
    const status =
      code === "ACTIVE_PAID_BOOKINGS"
        ? 409
        : code === "ADMIN_ACCOUNT"
          ? 403
          : message.includes("Token") || message.includes("autenticação")
            ? 401
            : message.includes("Firebase Admin")
              ? 503
              : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
