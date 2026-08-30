import { NextResponse } from "next/server";
import { notifyLessonReminders } from "@/lib/notifications/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorizedCron(request: Request): boolean {
  const secret =
    process.env.NOTIFICATIONS_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

/**
 * Cron: send the 1-hour lesson reminder. Vercel calls this on a schedule;
 * Hostinger can hit POST /api/notifications/reminders with the same secret.
 */
export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Cron não autorizado." }, { status: 401 });
  }

  try {
    const result = await notifyLessonReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível enviar os lembretes.";
    const status = message.includes("Firebase Admin") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
