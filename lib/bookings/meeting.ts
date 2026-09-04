const JITSI_BASE_URL = "https://meet.jit.si";
const MAX_MEETING_URL_LENGTH = 2048;

export function generateMeetingUrl(roomToken: string): string {
  const token = roomToken.trim();
  if (!token) {
    throw new Error("Informe o token da sala de aula.");
  }
  return `${JITSI_BASE_URL}/aprendizbay-${token}`;
}

/**
 * Accept only http(s) meeting links before rendering them as an external href.
 * Rejects javascript:, data:, credentials in the URL, and other unsafe schemes.
 */
export function parseSafeMeetingUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_MEETING_URL_LENGTH || /\s/.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      return null;
    }
    if (url.username || url.password) {
      return null;
    }
    if (!url.hostname) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
