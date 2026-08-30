import { NextResponse } from "next/server";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { dispatchNotification } from "@/lib/notifications/server";
import type { NotificationRequest } from "@/lib/notifications/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Vercel / next start counterpart to POST /api/notifications
 * (server/api/notifications.js on Hostinger Express).
 */
export async function POST(request: Request) {
  try {
    await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as NotificationRequest;
    const result = await dispatchNotification(body);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar o e-mail.";
    const status =
      message.includes("Token") || message.includes("autenticação")
        ? 401
        : message.includes("Firebase Admin")
          ? 503
          : message.includes("Informe") || message.includes("inválido")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
