import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { trackFacilitatorReferralClick } from "@/lib/facilitators/attach-referral";
import { getAdminApp } from "@/lib/firebase/admin";
import { normalizeReferralCode } from "@/lib/facilitators/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { referralCode?: string } | null;
    const referralCode = normalizeReferralCode(String(body?.referralCode ?? ""));
    if (!referralCode) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const result = await trackFacilitatorReferralClick(
      getFirestore(getAdminApp()),
      referralCode,
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
