import { describe, expect, it, vi } from "vitest";
import { JetSendEmailError } from "@/lib/email/jetsend-provider";
import type { EmailProvider, EmailResult } from "@/lib/email/provider";
import { buildBookingParticipantEventKey } from "@/lib/email/outbox/event-keys";
import {
  deliverOutboxEmail,
  enqueueAndDeliverTransactionalEmail,
  enqueueTransactionalEmail,
  processDueOutboxEmails,
} from "@/lib/email/outbox/process";
import { computeNextRetryAt } from "@/lib/email/outbox/retry";
import {
  createMemoryEmailOutboxStore,
} from "@/lib/email/outbox/store";
import { MAX_OUTBOX_ATTEMPTS } from "@/lib/email/outbox/types";

function sampleInput(eventKey: string) {
  return {
    eventName: "PAYMENT_CONFIRMED",
    eventKey,
    recipientUserId: "student-1",
    recipientEmail: "student@example.com",
    bookingId: "booking-1",
    subject: "Sua aula foi confirmada",
    templateName: "PAYMENT_CONFIRMED",
    text: "Texto",
    html: "<p>HTML</p>",
  };
}

function createProvider(
  behavior: () => Promise<EmailResult>,
): EmailProvider & { send: ReturnType<typeof vi.fn> } {
  const send = vi.fn(behavior);
  return { send };
}

describe("email outbox", () => {
  it("prevents duplicate events from creating a second outbox record", async () => {
    const store = createMemoryEmailOutboxStore();
    const eventKey = buildBookingParticipantEventKey(
      "PAYMENT_CONFIRMED",
      "booking-1",
      "student-1",
    );

    const first = await enqueueTransactionalEmail(store, sampleInput(eventKey));
    const second = await enqueueTransactionalEmail(store, sampleInput(eventKey));

    expect(first.kind).toBe("created");
    expect(second.kind).toBe("duplicate");
    expect(store.records.size).toBe(1);
  });

  it("handles simultaneous duplicate enqueue safely", async () => {
    const store = createMemoryEmailOutboxStore();
    const eventKey = buildBookingParticipantEventKey(
      "BOOKING_ACCEPTED",
      "booking-2",
      "student-2",
    );
    const input = sampleInput(eventKey);
    input.recipientEmail = "student2@example.com";

    const results = await Promise.all(
      Array.from({ length: 10 }, () => enqueueTransactionalEmail(store, input)),
    );

    expect(results.filter((result) => result.kind === "created")).toHaveLength(1);
    expect(results.filter((result) => result.kind === "duplicate").length).toBe(9);
    expect(store.records.size).toBe(1);
  });

  it("sends successfully and marks the outbox record as sent", async () => {
    const store = createMemoryEmailOutboxStore();
    const provider = createProvider(async () => ({ sent: true, provider: "jetsend" }));
    const eventKey = buildBookingParticipantEventKey(
      "BOOKING_CREATED",
      "booking-3",
      "tutor-1",
    );

    const result = await enqueueAndDeliverTransactionalEmail(sampleInput(eventKey), {
      store,
      provider,
    });

    expect(result).toEqual({ sent: true, provider: "jetsend" });
    const record = await store.get(eventKey);
    expect(record?.status).toBe("sent");
    expect(record?.provider).toBe("jetsend");
    expect(record?.attempts).toBe(0);
  });

  it("schedules retry after a temporary JetSend failure", async () => {
    const store = createMemoryEmailOutboxStore();
    const provider = createProvider(async () => {
      throw new JetSendEmailError("JetSend indisponível", {
        code: "jetsend_network_error",
      });
    });
    const now = new Date("2026-09-01T12:00:00.000Z");
    const eventKey = buildBookingParticipantEventKey(
      "PAYMENT_FAILED",
      "booking-4",
      "student-1",
    );

    const result = await enqueueAndDeliverTransactionalEmail(sampleInput(eventKey), {
      store,
      provider,
      now: () => now,
    });

    expect(result).toMatchObject({ sent: false, skipped: true, reason: "queued_for_retry" });
    const record = await store.get(eventKey);
    expect(record?.status).toBe("failed");
    expect(record?.attempts).toBe(1);
    expect(record?.nextRetryAt?.toISOString()).toBe(
      computeNextRetryAt(1, now).toISOString(),
    );
  });

  it("retries a failed outbox email when it becomes due", async () => {
    const store = createMemoryEmailOutboxStore();
    let calls = 0;
    const provider = createProvider(async () => {
      calls += 1;
      if (calls === 1) {
        throw new JetSendEmailError("temporary", { code: "jetsend_network_error" });
      }
      return { sent: true, provider: "jetsend" };
    });
    const eventKey = buildBookingParticipantEventKey(
      "PAYMENT_CONFIRMED",
      "booking-5",
      "student-1",
    );
    const enqueue = await enqueueTransactionalEmail(store, sampleInput(eventKey));
    expect(enqueue.kind).toBe("created");

    const firstAttempt = await deliverOutboxEmail(enqueue.emailId, {
      store,
      provider,
      now: () => new Date("2026-09-01T12:00:00.000Z"),
    });
    expect(firstAttempt.status).toBe("failed");

    const record = await store.get(enqueue.emailId);
    expect(record?.nextRetryAt).toBeInstanceOf(Date);

    const secondAttempt = await deliverOutboxEmail(enqueue.emailId, {
      store,
      provider,
      now: () => record!.nextRetryAt!,
    });

    expect(secondAttempt).toMatchObject({ status: "sent", sent: true });
    expect(calls).toBe(2);
  });

  it("marks invalid recipients as permanent failures without retrying", async () => {
    const store = createMemoryEmailOutboxStore();
    const provider = createProvider(async () => ({
      sent: false,
      skipped: true,
      reason: "invalid_recipient",
    }));
    const eventKey = buildBookingParticipantEventKey(
      "NEW_MESSAGE",
      "booking-6",
      "student-1",
    );

    const result = await enqueueAndDeliverTransactionalEmail(sampleInput(eventKey), {
      store,
      provider,
    });

    expect(result).toMatchObject({
      sent: false,
      skipped: true,
      reason: "invalid_recipient",
    });
    const record = await store.get(eventKey);
    expect(record?.status).toBe("permanent_failure");
    expect(record?.nextRetryAt).toBeUndefined();
  });

  it("marks permanent JetSend API failures without retrying", async () => {
    const store = createMemoryEmailOutboxStore();
    const provider = createProvider(async () => {
      throw new JetSendEmailError("invalid email", {
        code: "jetsend_api_error",
        status: 422,
        body: "invalid recipient",
      });
    });
    const eventKey = buildBookingParticipantEventKey(
      "REVIEW_REQUEST",
      "booking-7",
      "student-1",
    );

    const result = await enqueueAndDeliverTransactionalEmail(sampleInput(eventKey), {
      store,
      provider,
    });

    expect(result).toMatchObject({
      sent: false,
      skipped: true,
      reason: "permanent_failure",
    });
    const record = await store.get(eventKey);
    expect(record?.status).toBe("permanent_failure");
  });

  it("stops retrying after the maximum number of attempts", async () => {
    const store = createMemoryEmailOutboxStore();
    const provider = createProvider(async () => {
      throw new JetSendEmailError("temporary", { code: "jetsend_network_error" });
    });
    const eventKey = buildBookingParticipantEventKey(
      "LESSON_COMPLETED",
      "booking-8",
      "student-1",
    );
    const enqueue = await enqueueTransactionalEmail(store, sampleInput(eventKey));
    expect(enqueue.kind).toBe("created");

    let now = new Date("2026-09-01T12:00:00.000Z");
    for (let attempt = 1; attempt <= MAX_OUTBOX_ATTEMPTS; attempt += 1) {
      const result = await deliverOutboxEmail(enqueue.emailId, {
        store,
        provider,
        now: () => now,
      });
      if (attempt < MAX_OUTBOX_ATTEMPTS) {
        expect(result.status).toBe("failed");
        const record = await store.get(enqueue.emailId);
        now = record?.nextRetryAt ?? new Date(now.getTime() + 60_000);
      } else {
        expect(result.status).toBe("permanent_failure");
      }
    }

    const finalRecord = await store.get(enqueue.emailId);
    expect(finalRecord?.status).toBe("permanent_failure");
    expect(finalRecord?.attempts).toBe(MAX_OUTBOX_ATTEMPTS);
  });

  it("returns already-sent without resending", async () => {
    const store = createMemoryEmailOutboxStore();
    const provider = createProvider(async () => ({ sent: true, provider: "jetsend" }));
    const eventKey = buildBookingParticipantEventKey(
      "PAYMENT_CONFIRMED",
      "booking-9",
      "student-1",
    );

    const first = await enqueueAndDeliverTransactionalEmail(sampleInput(eventKey), {
      store,
      provider,
    });
    expect(first.sent).toBe(true);
    expect(provider.send).toHaveBeenCalledTimes(1);

    const second = await enqueueAndDeliverTransactionalEmail(sampleInput(eventKey), {
      store,
      provider,
    });
    expect(second).toMatchObject({ sent: true, skipped: true, reason: "already_sent" });
    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it("processes due outbox emails in batch", async () => {
    const store = createMemoryEmailOutboxStore();
    const provider = createProvider(async () => ({ sent: true, provider: "jetsend" }));

    await enqueueTransactionalEmail(
      store,
      sampleInput(
        buildBookingParticipantEventKey("PAYMENT_CONFIRMED", "booking-10", "student-1"),
      ),
    );
    await enqueueTransactionalEmail(
      store,
      sampleInput(
        buildBookingParticipantEventKey("PAYMENT_CONFIRMED", "booking-11", "student-2"),
      ),
    );

    const results = await processDueOutboxEmails({ store, provider });
    expect(results).toHaveLength(2);
    expect(results.every((result) => result.status === "sent")).toBe(true);
  });

  it("does not allow concurrent workers to claim the same email", async () => {
    const store = createMemoryEmailOutboxStore();
    let resolveSend: (() => void) | undefined;
    const provider = createProvider(
      () =>
        new Promise<EmailResult>((resolve) => {
          resolveSend = () => resolve({ sent: true, provider: "jetsend" });
        }),
    );
    const eventKey = buildBookingParticipantEventKey(
      "BOOKING_ACCEPTED",
      "booking-12",
      "student-1",
    );
    const enqueue = await enqueueTransactionalEmail(store, sampleInput(eventKey));
    expect(enqueue.kind).toBe("created");

    const firstClaim = deliverOutboxEmail(enqueue.emailId, { store, provider });
    const secondClaim = deliverOutboxEmail(enqueue.emailId, { store, provider });
    const secondResult = await secondClaim;
    expect(secondResult).toMatchObject({ sent: false, skipped: true, reason: "not_claimable" });

    resolveSend?.();
    const firstResult = await firstClaim;
    expect(firstResult).toMatchObject({ status: "sent", sent: true });
  });
});

describe("email outbox event keys", () => {
  it("builds stable participant keys", () => {
    expect(buildBookingParticipantEventKey("BOOKING_ACCEPTED", "b1", "s1")).toBe(
      "BOOKING_ACCEPTED:b1:s1",
    );
  });
});
