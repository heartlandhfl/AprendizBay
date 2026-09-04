import { afterEach, describe, expect, it } from "vitest";
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

  it("creates a join URL when meetingUrl is missing", () => {
    expect(jitsiClassroomProvider.resolveJoinUrl({ id: "booking-123" })).toBe(
      "https://meet.jit.si/aprendizbay-booking-123",
    );
  });

  it("adds an HMAC suffix when JITSI_ROOM_SECRET is configured", () => {
    process.env.JITSI_ROOM_SECRET = "test-room-secret";
    const url = jitsiClassroomProvider.createJoinUrl("booking-123");
    expect(url).toMatch(/^https:\/\/meet\.jit\.si\/aprendizbay-booking-123-[a-f0-9]{16}$/);
  });
});
