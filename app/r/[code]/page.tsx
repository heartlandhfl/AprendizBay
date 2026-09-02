import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFirestore } from "firebase-admin/firestore";
import { trackFacilitatorReferralClick } from "@/lib/facilitators/attach-referral";
import {
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
} from "@/lib/facilitators/config";
import { getAdminApp } from "@/lib/firebase/admin";
import { normalizeReferralCode } from "@/lib/facilitators/schema";

export const dynamic = "force-dynamic";

interface ReferralLandingPageProps {
  params: {
    code: string;
  };
}

export default async function ReferralLandingPage({ params }: ReferralLandingPageProps) {
  const referralCode = normalizeReferralCode(params.code);

  if (referralCode) {
    cookies().set(REFERRAL_COOKIE_NAME, referralCode, {
      maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });

    try {
      await trackFacilitatorReferralClick(getFirestore(getAdminApp()), referralCode);
    } catch {
      // Click tracking must not block signup redirect.
    }
  }

  redirect("/signup");
}
