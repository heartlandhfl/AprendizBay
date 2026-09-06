import { afterEach, describe, expect, it } from "vitest";
import { generateMeetingUrl } from "@/lib/bookings/meeting-server";
import { resolveClassroomJoinUrl } from "@/lib/classroom";

describe("resolveClassroomJoinUrl", () => {
  afterEach(() => {
    delete process.env.JITSI_ROOM_SECRET;
  });

  it("generates an unsuffixed URL for new bookings when the secret is absent", () => {
    expect(resolveClassroomJoinUrl({ id: "booking-123" })).toBe(
      "https://meet.jit.si/aprendizbay-booking-123",
    );
  });

  it("generates a suffixed URL for new bookings when JITSI_ROOM_SECRET is configured", () => {
    process.env.JITSI_ROOM_SECRET = "test-room-secret";
    expect(resolveClassroomJoinUrl({ id: "booking-123" })).toBe(
      generateMeetingUrl("booking-123"),
    );
    expect(resolveClassroomJoinUrl({ id: "booking-123" })).toMatch(
      /^https:\/\/meet\.jit\.si\/aprendizbay-booking-123-[a-f0-9]{16}$/,
    );
  });

  it("returns the stored meetingUrl without regenerating it", () => {
    process.env.JITSI_ROOM_SECRET = "test-room-secret";
    const stored = "https://meet.jit.si/aprendizbay-booking-123-legacyvalue";
    expect(
      resolveClassroomJoinUrl({
        id: "booking-123",
        meetingUrl: stored,
      }),
    ).toBe(stored);
  });
});
