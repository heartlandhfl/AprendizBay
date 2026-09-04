import { createHmac } from "node:crypto";

const JITSI_BASE_URL = "https://meet.jit.si";

function meetingRoomSecret(): string {
  return process.env.JITSI_ROOM_SECRET?.trim() ?? "";
}

function meetingRoomSuffix(bookingId: string): string {
  const secret = meetingRoomSecret();
  if (!secret) {
    return bookingId;
  }

  return `${bookingId}-${createHmac("sha256", secret).update(bookingId).digest("hex").slice(0, 16)}`;
}

/** Server-only meeting URL generation (supports optional JITSI_ROOM_SECRET). */
export function generateMeetingUrl(bookingId: string): string {
  return `${JITSI_BASE_URL}/aprendizbay-${meetingRoomSuffix(bookingId)}`;
}
