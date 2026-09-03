import { NextResponse } from "next/server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { syncSignupRoleFromProfile } from "@/lib/auth/role-server";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Syncs Firebase Auth custom claims after self-service signup.
 * - Students: no privileged claim required.
 * - Professors (profile role tutor/lecturer): grants lecturer claim server-side.
 */
export async function POST(request: Request) {
  try {
    const idToken = readBearerToken(request);
    const { uid } = await verifyUserIdToken(idToken);
    const role = await syncSignupRoleFromProfile(uid);

    return NextResponse.json({ ok: true, role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar papel.";
    const status = message.includes("Token") || message.includes("autenticação") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
