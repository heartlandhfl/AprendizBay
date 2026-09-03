import { timingSafeEqual } from "node:crypto";
import {
  WEBHOOK_UNAUTHORIZED_MESSAGE,
  WEBHOOK_UNCONFIGURED_MESSAGE,
} from "@/lib/email/jetsend-webhook/messages";

export interface JetSendWebhookAuthOptions {
  expectedUsername?: string;
  expectedPassword?: string;
}

export type JetSendWebhookAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

function readConfiguredUsername(): string {
  return String(process.env.JETSEND_WEBHOOK_USERNAME ?? "").trim();
}

function readConfiguredPassword(): string {
  return String(process.env.JETSEND_WEBHOOK_PASSWORD ?? "").trim();
}

function resolveExpectedCredentials(options?: JetSendWebhookAuthOptions): {
  username: string;
  password: string;
} {
  if (options && Object.prototype.hasOwnProperty.call(options, "expectedUsername")) {
    return {
      username: options.expectedUsername?.trim() ?? "",
      password: options.expectedPassword?.trim() ?? "",
    };
  }

  return {
    username: readConfiguredUsername(),
    password: readConfiguredPassword(),
  };
}

function secretsMatch(provided: string, expected: string): boolean {
  const actual = Buffer.from(provided);
  const required = Buffer.from(expected);
  if (actual.length !== required.length) {
    timingSafeEqual(required, required);
    return false;
  }
  return timingSafeEqual(actual, required);
}

function parseBasicAuthorization(header: string | null): {
  username: string;
  password: string;
} | null {
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

/**
 * JetSend webhooks support HTTP Basic authentication when creating a webhook
 * (Maropost KB: Creating and Managing Webhooks).
 */
export function authorizeJetSendWebhook(
  headers: Headers,
  options?: JetSendWebhookAuthOptions,
): JetSendWebhookAuthResult {
  const expected = resolveExpectedCredentials(options);
  if (!expected.username || !expected.password) {
    return { ok: false, status: 503, error: WEBHOOK_UNCONFIGURED_MESSAGE };
  }

  const provided = parseBasicAuthorization(headers.get("authorization"));
  if (
    !provided ||
    !secretsMatch(provided.username, expected.username) ||
    !secretsMatch(provided.password, expected.password)
  ) {
    return { ok: false, status: 401, error: WEBHOOK_UNAUTHORIZED_MESSAGE };
  }

  return { ok: true };
}

export function buildJetSendBasicAuthorizationHeader(
  username: string,
  password: string,
): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}
