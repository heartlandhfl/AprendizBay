import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";

import { persistContactMessage } from "@/lib/contact/persist-contact-message";
import { sendContactMessage } from "@/lib/contact/send-contact-message";
import { getAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasFirebaseAdminConfig(): boolean {
  return Boolean(
    String(process.env.FIREBASE_ADMIN_PROJECT_ID || "").trim() &&
      String(process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "").trim() &&
      String(process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").trim(),
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const persistFallback = hasFirebaseAdminConfig()
    ? async (
        input: { name: string; email: string; message: string },
        meta: { emailDelivery: "sent" | "failed" | "skipped"; emailSkipReason?: string },
      ) => {
        await persistContactMessage(getFirestore(getAdminApp()), input, meta);
        return true;
      }
    : undefined;

  const result = await sendContactMessage(
    {
      name: readField(body && typeof body === "object" ? (body as { name?: unknown }).name : ""),
      email: readField(body && typeof body === "object" ? (body as { email?: unknown }).email : ""),
      message: readField(
        body && typeof body === "object" ? (body as { message?: unknown }).message : "",
      ),
    },
    { persistFallback },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, delivery: result.delivery });
}
