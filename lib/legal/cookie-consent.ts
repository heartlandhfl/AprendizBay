import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_PREFERENCES_EVENT,
} from "@/lib/legal/constants";

export type CookieConsentDecision = {
  necessary: true;
  optional: boolean;
  decidedAt: string;
};

export function parseCookieConsent(value: unknown): CookieConsentDecision | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.necessary !== true || typeof record.optional !== "boolean") {
    return null;
  }

  const decidedAt =
    typeof record.decidedAt === "string" && record.decidedAt.trim()
      ? record.decidedAt
      : "";

  if (!decidedAt) {
    return null;
  }

  return {
    necessary: true,
    optional: record.optional,
    decidedAt,
  };
}

export function readCookieConsent(): CookieConsentDecision | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parseCookieConsent(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeCookieConsent(optional: boolean): CookieConsentDecision {
  const decision: CookieConsentDecision = {
    necessary: true,
    optional,
    decidedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(decision));
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT));
  }

  return decision;
}

export function hasCookieConsentDecision(): boolean {
  return readCookieConsent() !== null;
}

export function openCookiePreferences(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT));
}
