import { NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { verifyUserIdToken } from "@/lib/auth/admin-server";
import { getAdminApp } from "@/lib/firebase/admin";
import { readOrBackfillPublicProfile } from "@/lib/users/public-profile-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function normalizeUid(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Vercel / next start counterpart to GET /api/users/public-profile/:uid
 * (server/api/users.js on Hostinger Express). Returns displayName and photoUrl
 * only so booking/lesson UIs never read another user's private account document.
 */
export async function GET(
  request: Request,
  { params }: { params: { uid: string } },
) {
  const uid = normalizeUid(params.uid);
  if (!uid) {
    return NextResponse.json(
      { error: "Informe o identificador do usuário." },
      { status: 400 },
    );
  }

  try {
    await verifyUserIdToken(readBearerToken(request));
    const profile = await readOrBackfillPublicProfile(
      getFirestore(getAdminApp()),
      uid,
      FieldValue,
    );

    if (!profile) {
      return NextResponse.json(
        { error: "Conta encerrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      displayName: profile.displayName,
      photoUrl: profile.photoUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Token de autenticação") || message.includes("auth/")) {
      return NextResponse.json(
        { error: "Faça login para continuar." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível carregar o nome do participante." },
      { status: 500 },
    );
  }
}
