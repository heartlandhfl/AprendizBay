import { describe, expect, it } from "vitest";
import {
  generateMeetingRoomToken,
  generateMeetingUrl,
} from "@/lib/bookings/meeting-server";
import { parseSafeMeetingUrl } from "@/lib/bookings/meeting";

describe("generateMeetingRoomToken", () => {
  it("creates unpredictable room tokens instead of booking ids", () => {
    const first = generateMeetingRoomToken();
    const second = generateMeetingRoomToken();

    expect(first).toMatch(/^[a-f0-9]{32}$/);
    expect(second).toMatch(/^[a-f0-9]{32}$/);
    expect(first).not.toBe(second);
    expect(generateMeetingUrl(first)).toBe(`https://meet.jit.si/aprendizbay-${first}`);
  });
});

describe("parseSafeMeetingUrl", () => {
  it("accepts the generated Jitsi meeting URL", () => {
    const token = generateMeetingRoomToken();
    const url = generateMeetingUrl(token);
    expect(parseSafeMeetingUrl(url)).toBe(`https://meet.jit.si/aprendizbay-${token}`);
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
