import { describe, expect, it } from "vitest";
import {
  MESSAGE_EMAIL_COOLDOWN_MS,
  isConversationParticipant,
  readLastMessageEmailSentAt,
  shouldSendMessageEmail,
} from "@/lib/email/message-notification-policy";

describe("message notification policy", () => {
  const conversation = {
    studentId: "student-1",
    tutorId: "tutor-1",
    participantIds: ["student-1", "tutor-1"],
  };

  it("recognizes conversation participants", () => {
    expect(isConversationParticipant(conversation, "student-1")).toBe(true);
    expect(isConversationParticipant(conversation, "tutor-1")).toBe(true);
    expect(isConversationParticipant(conversation, "intruder")).toBe(false);
  });

  it("reads per-recipient lastMessageEmailSentAt timestamps", () => {
    const sentAt = new Date("2026-09-01T12:00:00.000Z");
    const value = readLastMessageEmailSentAt(
      {
        lastMessageEmailSentAt: {
          "student-1": sentAt,
        },
      },
      "student-1",
    );

    expect(value?.toISOString()).toBe(sentAt.toISOString());
    expect(readLastMessageEmailSentAt({}, "student-1")).toBeNull();
  });

  it("allows the first email and suppresses rapid follow-ups", () => {
    const now = new Date("2026-09-01T12:00:00.000Z");
    const recent = new Date(now.getTime() - MESSAGE_EMAIL_COOLDOWN_MS + 60_000);

    expect(shouldSendMessageEmail(null, now)).toBe(true);
    expect(shouldSendMessageEmail(recent, now)).toBe(false);
    expect(
      shouldSendMessageEmail(
        new Date(now.getTime() - MESSAGE_EMAIL_COOLDOWN_MS),
        now,
      ),
    ).toBe(true);
  });
});
