import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { attachReferralToUser } from "@/lib/facilitators/attach-referral";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { getAdminApp } from "@/lib/firebase/admin";
import { normalizeReferralCode } from "@/lib/facilitators/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function POST(request: Request) {
  try {
    const auth = await verifyUserIdToken(readBearerToken(request));
    const body = (await request.json().catch(() => null)) as {
      referralCode?: string;
      userPhone?: string;
      userCpf?: string;
    } | null;

    const referralCode = normalizeReferralCode(String(body?.referralCode ?? ""));
    if (!referralCode) {
      return NextResponse.json(
        { ok: false, reason: "Informe um código de indicação válido." },
        { status: 400 },
      );
    }

    const result = await attachReferralToUser(getFirestore(getAdminApp()), {
      userId: auth.uid,
      userEmail: auth.email ?? "",
      referralCode,
      userPhone: body?.userPhone,
      userCpf: body?.userCpf,
      source: "signup",
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível registrar a indicação.";
    const status = message.includes("Token") || message.includes("autenticação") ? 401 : 500;
    return NextResponse.json({ ok: false, reason: message }, { status });
  }
}
