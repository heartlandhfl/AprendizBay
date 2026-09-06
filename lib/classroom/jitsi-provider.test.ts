import { afterEach, describe, expect, it } from "vitest";
import { generateMeetingUrl } from "@/lib/bookings/meeting-server";
import { jitsiClassroomProvider } from "@/lib/classroom/jitsi-provider";

describe("jitsiClassroomProvider", () => {
  afterEach(() => {
    delete process.env.JITSI_ROOM_SECRET;
  });

  it("creates a predictable join URL without a room secret", () => {
    expect(jitsiClassroomProvider.createJoinUrl("booking-123")).toBe(
      "https://meet.jit.si/aprendizbay-booking-123",
    );
  });

  it("preserves an existing meeting URL on resolve", () => {
    const existing = "https://meet.jit.si/aprendizbay-booking-123-abc";
    expect(
      jitsiClassroomProvider.resolveJoinUrl({
        id: "booking-123",
        meetingUrl: existing,
      }),
    ).toBe(existing);
  });

  it("preserves a legacy unsuffixed meeting URL even when JITSI_ROOM_SECRET is configured", () => {
    process.env.JITSI_ROOM_SECRET = "test-room-secret";
    const legacy = "https://meet.jit.si/aprendizbay-booking-123";
    expect(
      jitsiClassroomProvider.resolveJoinUrl({
        id: "booking-123",
        meetingUrl: legacy,
      }),
    ).toBe(legacy);
  });

  it("does not regenerate a stored URL when the room secret changes", () => {
    process.env.JITSI_ROOM_SECRET = "old-secret";
    const stored = generateMeetingUrl("booking-123");

    process.env.JITSI_ROOM_SECRET = "new-secret";
    expect(
      jitsiClassroomProvider.resolveJoinUrl({
        id: "booking-123",
        meetingUrl: stored,
      }),
    ).toBe(stored);
    expect(stored).not.toBe(generateMeetingUrl("booking-123"));
  });

  it("creates a join URL when meetingUrl is missing", () => {
    expect(jitsiClassroomProvider.resolveJoinUrl({ id: "booking-123" })).toBe(
      "https://meet.jit.si/aprendizbay-booking-123",
    );
  });

  it("creates a suffixed join URL when meetingUrl is missing and JITSI_ROOM_SECRET is configured", () => {
    process.env.JITSI_ROOM_SECRET = "test-room-secret";
    const url = jitsiClassroomProvider.resolveJoinUrl({ id: "booking-123" });
    expect(url).toMatch(/^https:\/\/meet\.jit\.si\/aprendizbay-booking-123-[a-f0-9]{16}$/);
  });

  it("adds an HMAC suffix when JITSI_ROOM_SECRET is configured", () => {
    process.env.JITSI_ROOM_SECRET = "test-room-secret";
    const url = jitsiClassroomProvider.createJoinUrl("booking-123");
    expect(url).toMatch(/^https:\/\/meet\.jit\.si\/aprendizbay-booking-123-[a-f0-9]{16}$/);
  });
});
