import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { generateMeetingUrl as generateMeetingUrlServer } from "@/lib/bookings/meeting-server";
import { generateMeetingUrl, parseSafeMeetingUrl } from "@/lib/bookings/meeting";

const TEST_SECRET = "test-room-secret";
const BOOKING_ID = "booking-123";

function expectedHmacSuffix(bookingId: string, secret: string): string {
  return createHmac("sha256", secret).update(bookingId).digest("hex").slice(0, 16);
}

describe("server meeting URL generation", () => {
  afterEach(() => {
    delete process.env.JITSI_ROOM_SECRET;
  });

  it("uses the unsuffixed room name when JITSI_ROOM_SECRET is absent", () => {
    expect(generateMeetingUrlServer(BOOKING_ID)).toBe(
      "https://meet.jit.si/aprendizbay-booking-123",
    );
  });

  it("treats a whitespace-only JITSI_ROOM_SECRET as absent", () => {
    process.env.JITSI_ROOM_SECRET = "   ";
    expect(generateMeetingUrlServer(BOOKING_ID)).toBe(
      "https://meet.jit.si/aprendizbay-booking-123",
    );
  });

  it("adds a deterministic 16-char HMAC suffix when JITSI_ROOM_SECRET is configured", () => {
    process.env.JITSI_ROOM_SECRET = TEST_SECRET;
    const suffix = expectedHmacSuffix(BOOKING_ID, TEST_SECRET);
    expect(generateMeetingUrlServer(BOOKING_ID)).toBe(
      `https://meet.jit.si/aprendizbay-${BOOKING_ID}-${suffix}`,
    );
    expect(suffix).toMatch(/^[a-f0-9]{16}$/);
  });

  it("never embeds the raw secret in the generated URL", () => {
    process.env.JITSI_ROOM_SECRET = TEST_SECRET;
    const url = generateMeetingUrlServer(BOOKING_ID);
    expect(url.includes(TEST_SECRET)).toBe(false);
  });
});

describe("client meeting URL generation", () => {
  it("always uses the unsuffixed room name and never reads JITSI_ROOM_SECRET", () => {
    process.env.JITSI_ROOM_SECRET = TEST_SECRET;
    expect(generateMeetingUrl(BOOKING_ID)).toBe(
      "https://meet.jit.si/aprendizbay-booking-123",
    );
    delete process.env.JITSI_ROOM_SECRET;
  });
});

describe("parseSafeMeetingUrl", () => {
  afterEach(() => {
    delete process.env.JITSI_ROOM_SECRET;
  });

  it("accepts the generated Jitsi meeting URL without a room secret", () => {
    const url = generateMeetingUrl("booking-123");
    expect(parseSafeMeetingUrl(url)).toBe("https://meet.jit.si/aprendizbay-booking-123");
  });

  it("accepts server-generated URLs with an HMAC suffix", () => {
    process.env.JITSI_ROOM_SECRET = TEST_SECRET;
    const url = generateMeetingUrlServer("booking-123");
    expect(url).toMatch(/^https:\/\/meet\.jit\.si\/aprendizbay-booking-123-[a-f0-9]{16}$/);
    expect(parseSafeMeetingUrl(url)).toBe(url);
  });

  it("accepts a normal https meeting link", () => {
    expect(parseSafeMeetingUrl("https://meet.jit.si/turma-ingles")).toBe(
      "https://meet.jit.si/turma-ingles",
    );
  });

  it("returns null when the meeting URL is missing", () => {
    expect(parseSafeMeetingUrl(undefined)).toBeNull();
    expect(parseSafeMeetingUrl(null)).toBeNull();
    expect(parseSafeMeetingUrl("")).toBeNull();
    expect(parseSafeMeetingUrl("   ")).toBeNull();
  });

  it("rejects http and other non-https URLs", () => {
    expect(parseSafeMeetingUrl("http://meet.jit.si/aula")).toBeNull();
    expect(parseSafeMeetingUrl("javascript:alert(1)")).toBeNull();
    expect(parseSafeMeetingUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(parseSafeMeetingUrl("file:///etc/passwd")).toBeNull();
    expect(parseSafeMeetingUrl("ftp://meet.example.com/aula")).toBeNull();
    expect(parseSafeMeetingUrl("//meet.jit.si/aula")).toBeNull();
  });

  it("rejects URLs with credentials or whitespace", () => {
    expect(parseSafeMeetingUrl("https://user:secret@meet.jit.si/aula")).toBeNull();
    expect(parseSafeMeetingUrl("https://meet.jit.si/aula com espaço")).toBeNull();
  });
});
