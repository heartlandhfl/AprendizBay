import { NextResponse } from "next/server";
import { sendContactMessage } from "@/lib/contact/send-contact-message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const result = await sendContactMessage({
    name: readField(body && typeof body === "object" ? (body as { name?: unknown }).name : ""),
    email: readField(body && typeof body === "object" ? (body as { email?: unknown }).email : ""),
    message: readField(
      body && typeof body === "object" ? (body as { message?: unknown }).message : "",
    ),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
