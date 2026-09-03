import { MAX_OUTBOX_ATTEMPTS, OUTBOX_RETRY_DELAYS_MS } from "@/lib/email/outbox/types";

export function nextRetryDelayMs(attemptNumber: number): number {
  const index = Math.max(0, Math.min(attemptNumber - 1, OUTBOX_RETRY_DELAYS_MS.length - 1));
  return OUTBOX_RETRY_DELAYS_MS[index] ?? OUTBOX_RETRY_DELAYS_MS.at(-1)!;
}

export function computeNextRetryAt(attemptNumber: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + nextRetryDelayMs(attemptNumber));
}

export function hasReachedMaxAttempts(attempts: number): boolean {
  return attempts >= MAX_OUTBOX_ATTEMPTS;
}

export function isReadyForRetry(nextRetryAt: Date | undefined, now: Date = new Date()): boolean {
  if (!nextRetryAt) {
    return true;
  }

  return nextRetryAt.getTime() <= now.getTime();
}
