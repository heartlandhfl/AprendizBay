/**
 * Server-only admin auth helpers (firebase-admin).
 */
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";
import { assertAdminFromClaims, assertStudentActor } from "@/lib/auth/role-server";
import { normalizeRole } from "@/lib/auth/roles";

export async function verifyUserIdToken(
  idToken: string,
): Promise<{ uid: string; email?: string; customClaims?: Record<string, unknown> }> {
  if (!idToken.trim()) {
    throw new Error("Token de autenticação ausente.");
  }

  const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email,
    customClaims: decoded,
  };
}

export async function getUserProfile(uid: string): Promise<{
  role?: string;
  displayName?: string;
  email?: string;
} | null> {
  const snapshot = await getFirestore(getAdminApp()).collection("users").doc(uid).get();
  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() ?? {};
  const profileRole = typeof data.role === "string" ? data.role : undefined;
  return {
    role: profileRole ? (normalizeRole(profileRole) ?? profileRole) : undefined,
    displayName: typeof data.displayName === "string" ? data.displayName : undefined,
    email: typeof data.email === "string" ? data.email : undefined,
  };
}

export async function verifyAdminIdToken(idToken: string): Promise<string> {
  if (!idToken.trim()) {
    throw new Error("Token de autenticação ausente.");
  }

  const auth = getAuth(getAdminApp());
  const decoded = await auth.verifyIdToken(idToken);
  assertAdminFromClaims(decoded);

  return decoded.uid;
}

/** Authoritative student check: privileged claims are rejected; profile must be student when set. */
export function assertStudentApiActor(
  customClaims: Record<string, unknown> | undefined,
  profileRole?: string | null,
): void {
  assertStudentActor(customClaims);
  const normalized = profileRole ? normalizeRole(profileRole) : null;
  if (normalized && normalized !== "student") {
    throw new Error("Apenas alunos podem realizar esta ação.");
  }
}
