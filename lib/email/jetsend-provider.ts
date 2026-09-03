import type { EmailMessage, EmailProvider, EmailResult } from "@/lib/email/provider";
import { JetSendApiError, jetsendRequest } from "@/lib/jetsend/client";
import { isJetSendConfigured, readJetSendApiKey } from "@/lib/jetsend/config";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const emailEnvironment = require("../email/environment.js") as {
  resolveJetSendTransmissionApiUrl(): string;
  wrapEmailProviderWithEnvironmentGuards(provider: EmailProvider): EmailProvider;
};

export const JETSEND_TRANSMISSION_API_URL = "https://app.jetsend.com/api/v1/transmission/email";

const DEFAULT_FROM_NAME = "Aprendiz Bay";

export interface JetSendEmailErrorDetails {
  code: "jetsend_api_error" | "jetsend_network_error";
  status?: number;
  body?: string;
}

export class JetSendEmailError extends Error {
  readonly details: JetSendEmailErrorDetails;

  constructor(message: string, details: JetSendEmailErrorDetails) {
    super(message);
    this.name = "JetSendEmailError";
    this.details = details;
  }
}

export interface ParsedFromAddress {
  email: string;
  name?: string;
}

export function parseFromAddress(from: string): ParsedFromAddress {
  const value = String(from ?? "").trim();
  const match = value.match(/^(.*)<([^>]+)>$/);
  if (!match) {
    return { email: value };
  }

  return {
    name: match[1].trim().replace(/^"|"$/g, "") || undefined,
    email: match[2].trim(),
  };
}

export function resolveJetSendFromAddress(explicitFrom?: string): string {
  const configured =
    String(explicitFrom ?? "").trim() ||
    String(process.env.JETSEND_FROM_EMAIL ?? "").trim() ||
    String(process.env.EMAIL_FROM ?? "").trim() ||
    String(process.env.RESEND_FROM ?? "").trim();

  return configured;
}

export function isValidEmailAddress(value: string): boolean {
  const email = String(value ?? "").trim();
  if (!email || email.length > 254) {
    return false;
  }

  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) {
    return false;
  }

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!local || !domain || !domain.includes(".")) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function resolveJetSendTrackingDomain(): string | undefined {
  const trackingDomain = String(process.env.JETSEND_TRACKING_DOMAIN ?? "").trim();
  return trackingDomain || undefined;
}

function recipientDisplayName(email: string): string {
  const localPart = email.split("@")[0]?.trim();
  return localPart || email;
}

export interface JetSendTransmissionRequest {
  email: {
    options: {
      description: string;
      tracking_domain?: string;
    };
    recipients: Array<{
      address: {
        email: string;
        name: string;
      };
      metadata?: {
        emailOutboxId?: string;
      };
    }>;
    content: {
      from: {
        name: string;
        email: string;
      };
      subject: string;
      html: string;
      text: string;
    };
  };
}

export function buildJetSendTransmissionRequest(
  input: EmailMessage,
  fromAddress: string,
): JetSendTransmissionRequest {
  const fromParts = parseFromAddress(fromAddress);
  const trackingDomain = resolveJetSendTrackingDomain();

  return {
    email: {
      options: {
        description: input.subject,
        ...(trackingDomain ? { tracking_domain: trackingDomain } : {}),
      },
      recipients: [
        {
          address: {
            email: input.to.trim(),
            name: recipientDisplayName(input.to),
          },
          ...(input.emailOutboxId
            ? { metadata: { emailOutboxId: input.emailOutboxId } }
            : {}),
        },
      ],
      content: {
        from: {
          name: fromParts.name || DEFAULT_FROM_NAME,
          email: fromParts.email,
        },
        subject: input.subject,
        html: input.html,
        text: input.text,
      },
    },
  };
}

export function extractJetSendTransmissionId(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const results = (body as { results?: unknown }).results;
  if (!results || typeof results !== "object") {
    return undefined;
  }

  const id = (results as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

export class JetSendEmailProvider implements EmailProvider {
  async send(input: EmailMessage): Promise<EmailResult> {
    const recipient = String(input.to ?? "").trim();
    if (!recipient) {
      return { sent: false, skipped: true, reason: "missing_recipient" };
    }

    if (!isValidEmailAddress(recipient)) {
      return { sent: false, skipped: true, reason: "invalid_recipient" };
    }

    if (!isJetSendConfigured()) {
      console.warn(
        "[Aprendiz Bay] E-mail não enviado: defina JET_SEND_API_KEY (ou JETSEND_API_KEY) para usar o JetSend.",
      );
      return { sent: false, skipped: true, reason: "missing_api_key" };
    }

    const fromAddress = resolveJetSendFromAddress(input.from);
    if (!fromAddress || !isValidEmailAddress(parseFromAddress(fromAddress).email)) {
      return { sent: false, skipped: true, reason: "missing_from_address" };
    }

    const payload = buildJetSendTransmissionRequest(input, fromAddress);

    try {
      const body = await jetsendRequest<unknown>({
        url: emailEnvironment.resolveJetSendTransmissionApiUrl(),
        method: "POST",
        body: payload,
      });

      return {
        sent: true,
        provider: "jetsend",
        providerMessageId: extractJetSendTransmissionId(body),
      };
    } catch (error) {
      if (error instanceof JetSendApiError) {
        if (error.details.code === "missing_api_key") {
          return { sent: false, skipped: true, reason: "missing_api_key" };
        }

        if (error.details.code === "jetsend_network_error") {
          throw new JetSendEmailError(`JetSend indisponível: ${error.message}`, {
            code: "jetsend_network_error",
          });
        }

        throw new JetSendEmailError(error.message, {
          code: "jetsend_api_error",
          status: error.details.status,
          body: error.details.body,
        });
      }

      throw error;
    }
  }
}

export { readJetSendApiKey };
