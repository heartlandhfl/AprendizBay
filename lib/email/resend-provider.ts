import {
  isValidEmailAddress,
  parseFromAddress,
} from "@/lib/email/jetsend-provider";
import type { EmailMessage, EmailProvider, EmailResult } from "@/lib/email/provider";

export const RESEND_API_URL = "https://api.resend.com/emails";

export interface ResendEmailErrorDetails {
  code: "resend_api_error" | "resend_network_error";
  status?: number;
  body?: string;
}

export class ResendEmailError extends Error {
  readonly details: ResendEmailErrorDetails;

  constructor(message: string, details: ResendEmailErrorDetails) {
    super(message);
    this.name = "ResendEmailError";
    this.details = details;
  }
}

export function readResendApiKey(): string {
  return String(process.env.RESEND_API_KEY ?? "").trim();
}

export function isResendConfigured(): boolean {
  return Boolean(readResendApiKey());
}

export function resolveResendFromAddress(explicitFrom?: string): string {
  const configured =
    String(explicitFrom ?? "").trim() ||
    String(process.env.RESEND_FROM ?? "").trim() ||
    String(process.env.EMAIL_FROM ?? "").trim();

  return configured;
}

export function extractResendMessageId(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const id = (body as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

export interface ResendSendRequest {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  tags?: Array<{ name: string; value: string }>;
}

export function buildResendSendRequest(
  input: EmailMessage,
  fromAddress: string,
): ResendSendRequest {
  const fromParts = parseFromAddress(fromAddress);
  const from =
    fromParts.name && fromParts.email
      ? `${fromParts.name} <${fromParts.email}>`
      : fromParts.email;

  const request: ResendSendRequest = {
    from,
    to: [input.to.trim()],
    subject: input.subject,
    text: input.text,
    html: input.html,
  };

  if (input.emailOutboxId) {
    request.tags = [{ name: "emailOutboxId", value: input.emailOutboxId }];
  }

  return request;
}

export class ResendEmailProvider implements EmailProvider {
  async send(input: EmailMessage): Promise<EmailResult> {
    const recipient = String(input.to ?? "").trim();
    if (!recipient) {
      return { sent: false, skipped: true, reason: "missing_recipient" };
    }

    if (!isValidEmailAddress(recipient)) {
      return { sent: false, skipped: true, reason: "invalid_recipient" };
    }

    if (!isResendConfigured()) {
      console.warn(
        "[Aprendiz Bay] E-mail não enviado: defina RESEND_API_KEY para usar o Resend.",
      );
      return { sent: false, skipped: true, reason: "missing_api_key" };
    }

    const fromAddress = resolveResendFromAddress(input.from);
    if (!fromAddress || !isValidEmailAddress(parseFromAddress(fromAddress).email)) {
      return { sent: false, skipped: true, reason: "missing_from_address" };
    }

    const payload = buildResendSendRequest(input, fromAddress);

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${readResendApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new ResendEmailError(`Resend recusou o e-mail (${response.status})`, {
          code: "resend_api_error",
          status: response.status,
          body: body.slice(0, 400),
        });
      }

      let messageId: string | undefined;
      try {
        const body = await response.json();
        messageId = extractResendMessageId(body);
      } catch {
        messageId = undefined;
      }

      return {
        sent: true,
        provider: "resend",
        providerMessageId: messageId,
      };
    } catch (error) {
      if (error instanceof ResendEmailError) {
        throw error;
      }

      throw new ResendEmailError(
        error instanceof Error ? error.message : "Falha de rede ao enviar e-mail",
        { code: "resend_network_error" },
      );
    }
  }
}
