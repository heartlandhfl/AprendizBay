const JITSI_BASE_URL = "https://meet.jit.si";

export function generateMeetingUrl(bookingId: string): string {
  return `${JITSI_BASE_URL}/aprendizbay-${bookingId}`;
}
