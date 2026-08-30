/**
 * Hostinger audit — firebase-admin (Next.js server modules only)
 *
 * Tutor verification for admin approval. Called from lib/tutors/actions.ts
 * ("use server"). Not imported by server.js or server/api/.
 */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";

export async function verifyTutorProfile(tutorId: string): Promise<void> {
  const db = getFirestore(getAdminApp());
  const tutorRef = db.collection("tutors").doc(tutorId);
  const snapshot = await tutorRef.get();

  if (!snapshot.exists) {
    throw new Error("Professor não encontrado.");
  }

  if (snapshot.data()?.isVerified === true) {
    return;
  }

  await tutorRef.update({
    isVerified: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
