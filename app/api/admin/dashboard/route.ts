import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { statusFromAdminError } from "@/lib/admin/authorize";
import { buildAdminOperationsDashboard } from "@/lib/admin/dashboard";
import { verifyAdminIdToken } from "@/lib/auth/admin-server";
import { getAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Vercel / next start counterpart to GET /api/admin/dashboard
 * (server/api/admin.js on Hostinger Express).
 */
export async function GET(request: Request) {
  try {
    await verifyAdminIdToken(readBearerToken(request));
    const dashboard = await buildAdminOperationsDashboard({
      db: getFirestore(getAdminApp()),
    });
    return NextResponse.json({ ok: true, dashboard });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível carregar o painel.";
    return NextResponse.json({ error: message }, { status: statusFromAdminError(error) });
  }
}
