import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { listAdminFacilitatorPayouts } from "@/lib/admin/facilitator-payouts";
import { statusFromAdminError } from "@/lib/admin/authorize";
import { verifyAdminIdToken } from "@/lib/auth/admin-server";
import { getAdminApp } from "@/lib/firebase/admin";
import type { FacilitatorPayoutStatus } from "@/lib/facilitators/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function parseStatus(value: string | null): FacilitatorPayoutStatus {
  if (value === "pending" || value === "approved" || value === "paid" || value === "cancelled") {
    return value;
  }
  return "approved";
}

export async function GET(request: Request) {
  try {
    await verifyAdminIdToken(readBearerToken(request));
    const url = new URL(request.url);
    const status = parseStatus(url.searchParams.get("status"));
    const db = getFirestore(getAdminApp());
    const payouts = await listAdminFacilitatorPayouts(db, status);
    return NextResponse.json({ ok: true, payouts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível carregar os repasses.";
    return NextResponse.json({ error: message }, { status: statusFromAdminError(error) });
  }
}
