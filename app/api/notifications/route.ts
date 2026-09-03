import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { getAdminApp } from "@/lib/firebase/admin";
import {
  authorizeNotificationRequest,
  NotificationAuthorizationError,
} from "@/lib/notifications/authorize";
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
    const { uid } = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json()) as NotificationRequest;
    await authorizeNotificationRequest(getFirestore(getAdminApp()), uid, body);
    const result = await dispatchNotification(body);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar o e-mail.";
    const status =
      error instanceof NotificationAuthorizationError
        ? 403
        : message.includes("Token") || message.includes("autenticação")
          ? 401
          : message.includes("Firebase Admin")
            ? 503
            : message.includes("Informe") || message.includes("inválido")
              ? 400
              : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
