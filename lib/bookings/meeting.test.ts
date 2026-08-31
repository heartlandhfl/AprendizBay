import { describe, expect, it } from "vitest";
import { generateMeetingUrl, parseSafeMeetingUrl } from "@/lib/bookings/meeting";

describe("parseSafeMeetingUrl", () => {
  it("accepts the generated Jitsi meeting URL", () => {
    const url = generateMeetingUrl("booking-123");
    expect(parseSafeMeetingUrl(url)).toBe("https://meet.jit.si/aprendizbay-booking-123");
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
