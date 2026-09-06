import { JetSendEmailError } from "@/lib/email/jetsend-provider";
import { ResendEmailError } from "@/lib/email/resend-provider";
import type { EmailResult } from "@/lib/email/provider";

const PERMANENT_SKIP_REASONS = new Set([
  "missing_recipient",
  "invalid_recipient",
  "missing_from_address",
]);

const PERMANENT_HTTP_STATUSES = new Set([400, 401, 403, 404, 422]);

export function isPermanentSkipReason(reason: string | undefined): boolean {
  return Boolean(reason && PERMANENT_SKIP_REASONS.has(reason));
}

export function isPermanentProviderError(error: unknown): boolean {
  if (error instanceof JetSendEmailError || error instanceof ResendEmailError) {
    const status = error.details.status;
    return typeof status === "number" && PERMANENT_HTTP_STATUSES.has(status);
  }

  return false;
}

export function formatDeliveryError(error: unknown): string {
  if (error instanceof JetSendEmailError || error instanceof ResendEmailError) {
    const status = error.details.status;
    const body = error.details.body;
    return body
      ? `${error.message} ${body}`.slice(0, 500)
      : status
        ? `${error.message} (status ${status})`
        : error.message;
  }

  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return "Falha desconhecida ao enviar o e-mail.";
}

export function shouldTreatSkippedResultAsPermanent(result: EmailResult): boolean {
  return Boolean(result.skipped && isPermanentSkipReason(result.reason));
}
