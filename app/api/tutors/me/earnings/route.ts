import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getUserProfile, verifyUserIdToken } from "@/lib/auth/admin-server";
import { roleFromDecodedToken } from "@/lib/auth/role-server";
import { getAdminApp } from "@/lib/firebase/admin";
import { getTutorEarningsSummary } from "@/lib/tutors/earnings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function isLecturerAccess(
  claimRole: string | null,
  profileRole: string | undefined,
): boolean {
  return (
    claimRole === "lecturer" || profileRole === "tutor" || profileRole === "lecturer"
  );
}

export async function GET(request: Request) {
  try {
    const { uid, customClaims } = await verifyUserIdToken(readBearerToken(request));
    const profile = await getUserProfile(uid);
    const claimRole = roleFromDecodedToken(customClaims);

    if (!isLecturerAccess(claimRole, profile?.role)) {
      return NextResponse.json(
        { error: "Apenas professores podem ver ganhos." },
        { status: 403 },
      );
    }

    const earnings = await getTutorEarningsSummary(getFirestore(getAdminApp()), uid);
    return NextResponse.json({ ok: true, earnings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível carregar os ganhos.";
    const status = message.includes("Token") || message.includes("autenticação") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
