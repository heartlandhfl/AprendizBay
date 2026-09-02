import {
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
} from "@/lib/facilitators/config";
import { normalizeReferralCode } from "@/lib/facilitators/schema";

export { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SECONDS };

export function readReferralCodeFromCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part.startsWith(`${REFERRAL_COOKIE_NAME}=`)) {
      continue;
    }
    const value = decodeURIComponent(part.slice(REFERRAL_COOKIE_NAME.length + 1));
    const normalized = normalizeReferralCode(value);
    return normalized || null;
  }

  return null;
}

export function readReferralCodeFromDocument(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REFERRAL_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  const value = decodeURIComponent(match.slice(REFERRAL_COOKIE_NAME.length + 1));
  const normalized = normalizeReferralCode(value);
  return normalized || null;
}

export function clearReferralCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${REFERRAL_COOKIE_NAME}=; Max-Age=0; path=/; SameSite=Lax`;
}
