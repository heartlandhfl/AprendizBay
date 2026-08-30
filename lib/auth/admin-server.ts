/**
 * Server-only admin auth helpers (firebase-admin).
 */
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";

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
