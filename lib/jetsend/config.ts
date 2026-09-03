export const JETSEND_API_BASE_URL = "https://app.jetsend.com/api/v1";

export const JETSEND_TRANSMISSION_PATH = "/transmission/email";

export const JETSEND_SENDING_DOMAIN_PATH = "/sending_domain";

/**
 * Reads the JetSend API key from server-side environment variables only.
 * Prefer JET_SEND_API_KEY; JETSEND_API_KEY remains supported for compatibility.
 */
export function readJetSendApiKey(): string {
  return String(process.env.JET_SEND_API_KEY ?? process.env.JETSEND_API_KEY ?? "").trim();
}

export function isJetSendConfigured(): boolean {
  return Boolean(readJetSendApiKey());
}

export function resolveJetSendApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${JETSEND_API_BASE_URL}${normalized}`;
}
