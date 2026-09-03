import type { EmailProvider, EmailResult } from "@/lib/email/provider";
import {
  formatDeliveryError,
  isPermanentProviderError,
  shouldTreatSkippedResultAsPermanent,
} from "@/lib/email/outbox/permanent-failures";
import {
  computeNextRetryAt,
  hasReachedMaxAttempts,
} from "@/lib/email/outbox/retry";
import { toOutboxDocumentId } from "@/lib/email/outbox/event-keys";
import type { EmailOutboxStore } from "@/lib/email/outbox/store";
import {
  type DeliverOutboxResult,
  type EmailOutboxCreateInput,
  type EnqueueEmailResult,
} from "@/lib/email/outbox/types";

export interface DeliverOutboxDeps {
  store: EmailOutboxStore;
  provider: EmailProvider;
  now?: () => Date;
}

function toEmailResult(result: DeliverOutboxResult): EmailResult {
  if (result.sent) {
    return { sent: true, provider: result.provider as EmailResult["provider"] };
  }

  return {
    sent: false,
    skipped: result.skipped,
    reason: result.reason,
    provider: result.provider as EmailResult["provider"],
  };
}

export async function enqueueTransactionalEmail(
  store: EmailOutboxStore,
  input: EmailOutboxCreateInput,
): Promise<EnqueueEmailResult> {
  return store.enqueue(input);
}

export async function deliverOutboxEmail(
  emailId: string,
  deps: DeliverOutboxDeps,
): Promise<DeliverOutboxResult> {
  const now = deps.now?.() ?? new Date();
  const claimed = await deps.store.claim(emailId, now);
  if (!claimed) {
    const existing = await deps.store.get(emailId);
    if (existing?.status === "sent") {
      return {
        emailId,
        status: "sent",
        sent: true,
        skipped: true,
        reason: "already_sent",
        provider: existing.provider,
      };
    }

    return {
      emailId,
      status: existing?.status ?? "pending",
      sent: false,
      skipped: true,
      reason: "not_claimable",
    };
  }

  try {
    const result = await deps.provider.send({
      to: claimed.recipientEmail,
      subject: claimed.subject,
      text: claimed.text,
      html: claimed.html,
      from: claimed.from,
      emailOutboxId: emailId,
    });

    if (result.sent) {
      await deps.store.markSent(emailId, {
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        sentAt: now,
      });
      return {
        emailId,
        status: "sent",
        sent: true,
        provider: result.provider,
      };
    }

    if (shouldTreatSkippedResultAsPermanent(result)) {
      await deps.store.markFailed(emailId, {
        attempts: Math.max(claimed.attempts, 1),
        lastError: result.reason ?? "permanent_skip",
        failedAt: now,
        status: "permanent_failure",
      });
      return {
        emailId,
        status: "permanent_failure",
        sent: false,
        skipped: true,
        reason: result.reason,
      };
    }

    const attempts = claimed.attempts + 1;
    if (hasReachedMaxAttempts(attempts)) {
      await deps.store.markFailed(emailId, {
        attempts,
        lastError: result.reason ?? "max_attempts",
        failedAt: now,
        status: "permanent_failure",
      });
      return {
        emailId,
        status: "permanent_failure",
        sent: false,
        skipped: true,
        reason: result.reason ?? "max_attempts",
      };
    }

    await deps.store.markFailed(emailId, {
      attempts,
      lastError: result.reason ?? "temporary_skip",
      failedAt: now,
      nextRetryAt: computeNextRetryAt(attempts, now),
      status: "failed",
    });
    return {
      emailId,
      status: "failed",
      sent: false,
      skipped: true,
      reason: result.reason ?? "queued_for_retry",
    };
  } catch (error) {
    const attempts = claimed.attempts + 1;
    const lastError = formatDeliveryError(error);

    if (isPermanentProviderError(error) || hasReachedMaxAttempts(attempts)) {
      await deps.store.markFailed(emailId, {
        attempts,
        lastError,
        failedAt: now,
        status: "permanent_failure",
      });
      return {
        emailId,
        status: "permanent_failure",
        sent: false,
        skipped: true,
        reason: "permanent_failure",
      };
    }

    await deps.store.markFailed(emailId, {
      attempts,
      lastError,
      failedAt: now,
      nextRetryAt: computeNextRetryAt(attempts, now),
      status: "failed",
    });
    return {
      emailId,
      status: "failed",
      sent: false,
      skipped: true,
      reason: "queued_for_retry",
    };
  }
}

export async function enqueueAndDeliverTransactionalEmail(
  input: EmailOutboxCreateInput,
  deps: DeliverOutboxDeps,
): Promise<EmailResult> {
  const enqueueResult = await enqueueTransactionalEmail(deps.store, input);

  if (enqueueResult.kind === "already_sent") {
    return { sent: true, skipped: true, reason: "already_sent" };
  }
  if (enqueueResult.kind === "permanent_failure") {
    return { sent: false, skipped: true, reason: "permanent_failure" };
  }

  const deliverResult = await deliverOutboxEmail(enqueueResult.emailId, deps);
  return toEmailResult(deliverResult);
}

export async function processDueOutboxEmails(
  deps: DeliverOutboxDeps,
  limit = 25,
): Promise<DeliverOutboxResult[]> {
  const now = deps.now?.() ?? new Date();
  const due = await deps.store.listDueForRetry(now);
  const results: DeliverOutboxResult[] = [];

  for (const record of due.slice(0, limit)) {
    const emailId = toOutboxDocumentId(record.eventKey);
    results.push(await deliverOutboxEmail(emailId, deps));
  }

  return results;
}
