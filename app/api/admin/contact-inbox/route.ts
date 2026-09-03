import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";

import { statusFromAdminError } from "@/lib/admin/authorize";
import {
  buildAdminContactInboxList,
  parseAdminContactInboxFilters,
} from "@/lib/admin/contact-inbox";
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
    const filters = parseAdminContactInboxFilters(new URL(request.url).searchParams);
    const inbox = await buildAdminContactInboxList(getFirestore(getAdminApp()), filters);

    return NextResponse.json({ ok: true, inbox });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar a caixa de entrada de contatos.";
    return NextResponse.json({ error: message }, { status: statusFromAdminError(error) });
  }
}
