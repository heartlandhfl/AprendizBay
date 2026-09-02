"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
} from "@/lib/facilitators/config";
import { normalizeReferralCode } from "@/lib/facilitators/schema";

export default function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawCode = searchParams.get("ref") ?? searchParams.get("r");
    const referralCode = normalizeReferralCode(rawCode ?? "");
    if (!referralCode) {
      return;
    }

    document.cookie = `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(referralCode)}; Max-Age=${REFERRAL_COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;

    void fetch("/api/referrals/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode }),
    }).catch(() => undefined);
  }, [searchParams]);

  return null;
}
