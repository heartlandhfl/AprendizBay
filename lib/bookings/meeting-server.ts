import { randomBytes } from "node:crypto";

const JITSI_BASE_URL = "https://meet.jit.si";

export function generateMeetingRoomToken(): string {
  return randomBytes(16).toString("hex");
}

export function generateMeetingUrl(roomToken: string): string {
  const token = roomToken.trim();
  if (!token) {
    throw new Error("Informe o token da sala de aula.");
  }
  return `${JITSI_BASE_URL}/aprendizbay-${token}`;
}
