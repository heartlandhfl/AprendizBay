import { getActiveEmailProvider } from "@/lib/email/resend-sendgrid-provider";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/constants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;

export interface ContactFormInput {
  name: string;
  email: string;
  message: string;
}

export type ContactSendResult =
  | { ok: true; delivery: "email" | "inbox" }
  | { ok: false; status: 400 | 503 | 500; error: string };

import type { ContactEmailDelivery } from "@/lib/contact/types";

export interface ContactDeliveryDeps {
  persistFallback?: (
    input: ContactFormInput,
    meta: { emailDelivery: ContactEmailDelivery; emailSkipReason?: string },
  ) => Promise<boolean>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function validateContactForm(input: ContactFormInput): ContactSendResult | null {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (!name || !email || !message) {
    return { ok: false, status: 400, error: "Preencha nome, e-mail e mensagem." };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, status: 400, error: "Informe um e-mail válido." };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, status: 400, error: "A mensagem é muito longa." };
  }

  return null;
}

export async function sendContactMessage(
  input: ContactFormInput,
  deps: ContactDeliveryDeps = {},
): Promise<ContactSendResult> {
  const validationError = validateContactForm(input);
  if (validationError) {
    return validationError;
  }

  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();
  const normalizedInput = { name, email, message };

  const subject = `Contato pelo site: ${name}`;
  const text = `Nome: ${name}\nE-mail: ${email}\n\n${message}`;
  const html = `<p><strong>Nome:</strong> ${escapeHtml(name)}</p>
<p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
<p><strong>Mensagem:</strong></p>
<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`;

  try {
    const result = await getActiveEmailProvider().send({
      to: SUPPORT_CONTACT_EMAIL,
      subject,
      text,
      html,
    });

    if (result.sent) {
      return { ok: true, delivery: "email" };
    }

    const skipReason = "reason" in result ? String(result.reason ?? "unknown") : "unknown";
    console.warn("[Aprendiz Bay] Contato não enviado por e-mail:", skipReason);

    if (deps.persistFallback) {
      const stored = await deps.persistFallback(normalizedInput, {
        emailDelivery: "skipped",
        emailSkipReason: skipReason,
      });
      if (stored) {
        return { ok: true, delivery: "inbox" };
      }
    }

    return {
      ok: false,
      status: 503,
      error: "O envio por e-mail está temporariamente indisponível. Use o endereço abaixo.",
    };
  } catch (error) {
    console.error("[Aprendiz Bay] Falha ao enviar contato:", error);

    if (deps.persistFallback) {
      try {
        const stored = await deps.persistFallback(normalizedInput, {
          emailDelivery: "failed",
          emailSkipReason: "send_failed",
        });
        if (stored) {
          return { ok: true, delivery: "inbox" };
        }
      } catch (persistError) {
        console.error("[Aprendiz Bay] Falha ao registrar contato no Firestore:", persistError);
      }
    }

    return {
      ok: false,
      status: 500,
      error: "Não foi possível enviar sua mensagem. Tente novamente.",
    };
  }
}
