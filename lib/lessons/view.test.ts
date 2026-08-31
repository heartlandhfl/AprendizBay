import { describe, expect, it } from "vitest";
import type { Timestamp } from "firebase/firestore";
import type { Booking } from "@/lib/bookings/types";
import { generateMeetingUrl } from "@/lib/bookings/meeting";
import { buildLessonView, lessonViewOmitsPaymentFields } from "@/lib/lessons/view";

const NOW = new Date("2026-08-31T20:00:00.000Z");
const PAST = {
  toDate: () => new Date("2026-08-30T19:00:00.000Z"),
  toMillis: () => Date.parse("2026-08-30T19:00:00.000Z"),
} as Timestamp;

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-123",
    studentId: "student-1",
    tutorId: "tutor-1",
    type: "individual",
    status: "confirmed",
    price: 80,
    platformFee: 8,
    tutorAmount: 72,
    scheduledAt: PAST,
    createdAt: PAST,
    meetingUrl: generateMeetingUrl("booking-123"),
    paymentStatus: "paid",
    paymentId: "pay_secret_080225913252",
    asaasCheckoutId: "checkout_secret",
    refundId: "refund_secret",
    ...overrides,
  };
}

const META = {
  tutorName: "Mariana Silva",
  studentName: "Ana Souza",
  subject: "Inglês",
  modality: "online" as const,
};

describe("buildLessonView", () => {
  it("returns a participant view without private payment fields", () => {
    const view = buildLessonView(booking(), META, "student-1", NOW);

    expect(view).not.toBeNull();
    expect(view?.tutorName).toBe("Mariana Silva");
    expect(view?.studentName).toBe("Ana Souza");
    expect(view?.subject).toBe("Inglês");
    expect(view?.statusLabel).toBe("Confirmada");
    expect(view?.meetingUrl).toBe(generateMeetingUrl("booking-123"));
    expect(view?.canJoin).toBe(true);
    expect(lessonViewOmitsPaymentFields(view!)).toBe(true);
    expect(JSON.stringify(view)).not.toMatch(/pay_secret|checkout_secret|refund_secret/);
  });

  it("does not build a view for a user who is not a participant", () => {
    expect(buildLessonView(booking(), META, "student-2", NOW)).toBeNull();
    expect(buildLessonView(booking(), META, "tutor-2", NOW)).toBeNull();
  });

  it("explains a missing meeting URL instead of exposing a join link", () => {
    const view = buildLessonView(
      booking({ meetingUrl: undefined }),
      META,
      "student-1",
      NOW,
    );

    expect(view?.canJoin).toBe(false);
    expect(view?.meetingUrl).toBeNull();
    expect(view?.missingMeetingMessage).toMatch(/ainda não está disponível/);
  });

  it("rejects an unsafe meeting URL", () => {
    const view = buildLessonView(
      booking({ meetingUrl: "javascript:alert(1)" }),
      META,
      "tutor-1",
      NOW,
    );

    expect(view?.canJoin).toBe(false);
    expect(view?.meetingUrl).toBeNull();
    expect(view?.missingMeetingMessage).toBeTruthy();
  });

  it("shows the complete action only to the tutor of a confirmed lesson", () => {
    const tutorView = buildLessonView(booking(), { ...META, viewerRole: "tutor" }, "tutor-1", NOW);
    const studentView = buildLessonView(
      booking(),
      { ...META, viewerRole: "student" },
      "student-1",
      NOW,
    );

    expect(tutorView?.showCompleteButton).toBe(true);
    expect(tutorView?.canComplete).toBe(true);
    expect(studentView?.showCompleteButton).toBe(false);
    expect(studentView?.canComplete).toBe(false);
  });
});
