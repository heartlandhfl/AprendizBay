import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getFacilitatorDashboard } from "@/lib/facilitators/dashboard";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { getAdminApp } from "@/lib/firebase/admin";
import { getSiteOrigin } from "@/lib/seo/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function GET(request: Request) {
  try {
    const auth = await verifyUserIdToken(readBearerToken(request));
    const dashboard = await getFacilitatorDashboard(
      getFirestore(getAdminApp()),
      auth.uid,
      getSiteOrigin(),
    );

    if (!dashboard) {
      return NextResponse.json(
        { error: "Você não possui acesso de facilitador." },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true, dashboard });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível carregar o painel.";
    const status = message.includes("Token") || message.includes("autenticação") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
