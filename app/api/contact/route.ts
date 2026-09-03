import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/notifications/core";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  const name = readField(body && typeof body === "object" ? (body as { name?: unknown }).name : "");
  const email = readField(body && typeof body === "object" ? (body as { email?: unknown }).email : "");
  const message = readField(
    body && typeof body === "object" ? (body as { message?: unknown }).message : "",
  );

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Preencha nome, e-mail e mensagem." }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "A mensagem é muito longa." }, { status: 400 });
  }

  const subject = `Contato pelo site: ${name}`;
  const text = `Nome: ${name}\nE-mail: ${email}\n\n${message}`;
  const html = `<p><strong>Nome:</strong> ${escapeHtml(name)}</p>
<p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
<p><strong>Mensagem:</strong></p>
<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`;

  try {
    const result = await sendEmail({
      to: SUPPORT_CONTACT_EMAIL,
      subject,
      text,
      html,
    });

    if (!result.sent) {
      return NextResponse.json(
        {
          error:
            "O envio por e-mail está temporariamente indisponível. Use o endereço abaixo.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível enviar sua mensagem. Tente novamente." },
      { status: 500 },
    );
  }
}
