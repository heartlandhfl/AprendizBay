import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { listAvailableFacilitatorCommissionsSummary } from "@/lib/admin/facilitator-payouts";
import { statusFromAdminError } from "@/lib/admin/authorize";
import { verifyAdminIdToken } from "@/lib/auth/admin-server";
import { getAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function GET(request: Request) {
  try {
    await verifyAdminIdToken(readBearerToken(request));
    const summaries = await listAvailableFacilitatorCommissionsSummary(
      getFirestore(getAdminApp()),
    );
    return NextResponse.json({ ok: true, summaries });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível carregar as comissões.";
    return NextResponse.json({ error: message }, { status: statusFromAdminError(error) });
  }
}
