import { NextResponse } from "next/server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_MS,
} from "@/lib/auth/session-constants";
import { createAuthSessionCookie } from "@/lib/auth/session-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function sessionCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(AUTH_SESSION_MAX_AGE_MS / 1000),
  };
}

export async function POST(request: Request) {
  try {
    const idToken = readBearerToken(request);
    await verifyUserIdToken(idToken);
    const sessionCookie = await createAuthSessionCookie(idToken);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_SESSION_COOKIE, sessionCookie, sessionCookieOptions());
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível iniciar a sessão.";
    const status = message.includes("Token") || message.includes("autenticação") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
