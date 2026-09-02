import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { markFacilitatorPayoutPaid } from "@/lib/admin/facilitator-payouts";
import { statusFromAdminError } from "@/lib/admin/authorize";
import { verifyAdminIdToken } from "@/lib/auth/admin-server";
import { getAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function POST(request: Request) {
  try {
    await verifyAdminIdToken(readBearerToken(request));
    const body = (await request.json().catch(() => null)) as { payoutId?: string } | null;
    const payoutId = String(body?.payoutId ?? "").trim();
    if (!payoutId) {
      return NextResponse.json({ error: "Informe o identificador do repasse." }, { status: 400 });
    }

    const payout = await markFacilitatorPayoutPaid(getFirestore(getAdminApp()), payoutId);
    return NextResponse.json({ ok: true, payout });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível marcar o repasse como pago.";
    return NextResponse.json({ error: message }, { status: statusFromAdminError(error) });
  }
}
