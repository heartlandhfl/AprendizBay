import { describe, expect, it } from "vitest";
import {
  authorizeNotificationRequest,
  CLIENT_NOTIFICATION_TYPES,
  NotificationAuthorizationError,
} from "@/lib/notifications/authorize";
import type { NotificationRequest } from "@/lib/notifications/types";

function createMockDb(seed: {
  bookings?: Record<string, Record<string, unknown>>;
  tutors?: Record<string, Record<string, unknown>>;
  reviews?: Record<string, Record<string, unknown>>;
  conversations?: Record<string, Record<string, unknown>>;
  messages?: Record<string, Record<string, unknown>>;
}) {
  return {
    collection(name: string) {
      return {
        doc(id: string) {
          return {
            async get() {
              const data =
                name === "bookings"
                  ? seed.bookings?.[id]
                  : name === "tutors"
                    ? seed.tutors?.[id]
                    : name === "reviews"
                      ? seed.reviews?.[id]
                      : name === "conversations"
                        ? seed.conversations?.[id]
                        : undefined;
              return { exists: Boolean(data), id, data: () => data };
            },
            collection() {
              return {
                doc(messageId: string) {
                  return {
                    async get() {
                      const data = seed.messages?.[`${id}/${messageId}`];
                      return { exists: Boolean(data), id: messageId, data: () => data };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe("authorizeNotificationRequest", () => {
  it("allows only client-safe notification types", () => {
    expect(CLIENT_NOTIFICATION_TYPES.has("pending_booking")).toBe(true);
    expect(CLIENT_NOTIFICATION_TYPES.has("new_message")).toBe(true);
    expect(CLIENT_NOTIFICATION_TYPES.has("confirmed_booking" as NotificationRequest["type"])).toBe(
      false,
    );
    expect(CLIENT_NOTIFICATION_TYPES.has("lesson_reminder" as NotificationRequest["type"])).toBe(
      false,
    );
  });

  it("rejects server-only notification types", async () => {
    const db = createMockDb({});
    await expect(
      authorizeNotificationRequest(db as never, "user-1", {
        type: "confirmed_booking" as NotificationRequest["type"],
        bookingId: "booking-1",
      }),
    ).rejects.toThrow(NotificationAuthorizationError);
  });

  it("rejects cross-user registration emails", async () => {
    const db = createMockDb({});
    await expect(
      authorizeNotificationRequest(db as never, "attacker-1", {
        type: "user_registered",
        userId: "victim-1",
      }),
    ).rejects.toThrow(/outro usuário/);
  });

  it("rejects pending booking emails from non-students", async () => {
    const db = createMockDb({
      bookings: {
        "booking-1": { studentId: "student-1", tutorId: "tutor-1" },
      },
    });

    await expect(
      authorizeNotificationRequest(db as never, "attacker-1", {
        type: "pending_booking",
        bookingId: "booking-1",
      }),
    ).rejects.toThrow(/Somente o aluno/);
  });

  it("rejects booking accepted emails from non-tutors", async () => {
    const db = createMockDb({
      bookings: {
        "booking-1": { studentId: "student-1", tutorId: "tutor-1" },
      },
      tutors: {
        "tutor-1": { userId: "tutor-owner" },
      },
    });

    await expect(
      authorizeNotificationRequest(db as never, "student-1", {
        type: "booking_accepted",
        bookingId: "booking-1",
      }),
    ).rejects.toThrow(/Somente o professor/);
  });

  it("allows booking accepted emails from the tutor owner", async () => {
    const db = createMockDb({
      bookings: {
        "booking-1": { studentId: "student-1", tutorId: "tutor-1" },
      },
      tutors: {
        "tutor-1": { userId: "tutor-owner" },
      },
    });

    await expect(
      authorizeNotificationRequest(db as never, "tutor-owner", {
        type: "booking_accepted",
        bookingId: "booking-1",
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects review notifications from non-authors", async () => {
    const db = createMockDb({
      reviews: {
        "review-1": { studentId: "student-1", tutorId: "tutor-1" },
      },
    });

    await expect(
      authorizeNotificationRequest(db as never, "attacker-1", {
        type: "new_review",
        reviewId: "review-1",
      }),
    ).rejects.toThrow(/autor da avaliação/);
  });

  it("rejects message notifications from non-senders", async () => {
    const db = createMockDb({
      conversations: {
        "student-1_tutor-1": {
          studentId: "student-1",
          tutorId: "tutor-1",
          participantIds: ["student-1", "tutor-1"],
        },
      },
      messages: {
        "student-1_tutor-1/msg-1": { senderId: "tutor-1", text: "Olá" },
      },
    });

    await expect(
      authorizeNotificationRequest(db as never, "student-1", {
        type: "new_message",
        conversationId: "student-1_tutor-1",
        messageId: "msg-1",
        recipientUserId: "tutor-1",
      }),
    ).rejects.toThrow(/Somente o remetente/);
  });

  it("rejects manipulated message recipients", async () => {
    const db = createMockDb({
      conversations: {
        "student-1_tutor-1": {
          studentId: "student-1",
          tutorId: "tutor-1",
          participantIds: ["student-1", "tutor-1"],
        },
      },
      messages: {
        "student-1_tutor-1/msg-1": { senderId: "tutor-1", text: "Olá" },
      },
      tutors: {
        "tutor-1": { userId: "tutor-owner" },
      },
    });

    await expect(
      authorizeNotificationRequest(db as never, "tutor-owner", {
        type: "new_message",
        conversationId: "student-1_tutor-1",
        messageId: "msg-1",
        recipientUserId: "tutor-1",
      }),
    ).rejects.toThrow(/Destinatário inválido/);
  });

  it("allows valid new message notifications from the sender", async () => {
    const db = createMockDb({
      conversations: {
        "student-1_tutor-1": {
          studentId: "student-1",
          tutorId: "tutor-1",
          participantIds: ["student-1", "tutor-1"],
        },
      },
      messages: {
        "student-1_tutor-1/msg-1": { senderId: "tutor-1", text: "Olá" },
      },
      tutors: {
        "tutor-1": { userId: "tutor-owner" },
      },
    });

    await expect(
      authorizeNotificationRequest(db as never, "tutor-owner", {
        type: "new_message",
        conversationId: "student-1_tutor-1",
        messageId: "msg-1",
        recipientUserId: "student-1",
      }),
    ).resolves.toBeUndefined();
  });
});
