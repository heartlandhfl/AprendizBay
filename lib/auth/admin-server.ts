/**
 * Server-only admin auth helpers (firebase-admin).
 */
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";

export async function verifyUserIdToken(
  idToken: string,
): Promise<{ uid: string; email?: string }> {
  if (!idToken.trim()) {
    throw new Error("Token de autenticação ausente.");
  }

  const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email,
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
  return {
    role: typeof data.role === "string" ? data.role : undefined,
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

  const userSnap = await getFirestore(getAdminApp())
    .collection("users")
    .doc(decoded.uid)
    .get();

  if (!userSnap.exists || userSnap.data()?.role !== "admin") {
    throw new Error("Acesso restrito a administradores.");
  }

  return decoded.uid;
}
