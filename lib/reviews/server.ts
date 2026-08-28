import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | undefined;

function getAdminFirestore(): Firestore {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK requires FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  if (!adminApp) {
    adminApp =
      getApps().length > 0
        ? getApps()[0]!
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          });
  }

  return getFirestore(adminApp);
}

export async function recomputeTutorRating(tutorId: string): Promise<void> {
  const db = getAdminFirestore();
  const reviewsSnap = await db.collection("reviews").where("tutorId", "==", tutorId).get();

  const ratings = reviewsSnap.docs.map(
    (docSnap) => docSnap.data().rating as number,
  );
  const reviewCount = ratings.length;
  const rating =
    reviewCount > 0
      ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / reviewCount) * 10) /
        10
      : 0;

  await db.collection("tutors").doc(tutorId).update({
    rating,
    reviewCount,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
