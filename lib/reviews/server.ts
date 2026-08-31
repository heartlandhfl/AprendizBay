/**
 * Hostinger audit — firebase-admin (Next.js server modules)
 *
 * Used by lib/reviews/actions.ts ("use server"),
 * app/api/reviews/route.ts and app/api/reviews/recompute-rating/route.ts
 * on Vercel / next start.
 *
 * Production Hostinger does not execute this module. Express serves the same
 * create and recompute via POST /api/reviews and
 * POST /api/reviews/recompute-rating (server/api/reviews.js),
 * which lazy-load firebase-admin from server/api/firebase-admin.js.
 *
 * Do not import this file from server.js. Express must use server/api/reviews.js.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  computeTutorRatingFromRatings,
  createReviewForStudent,
  ratingsFromReviewDocs,
  type CreateReviewResult,
} from "@/lib/reviews/create-review";

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

  const ratings = ratingsFromReviewDocs(reviewsSnap.docs);
  const { rating, reviewCount } = computeTutorRatingFromRatings(ratings);

  await db.collection("tutors").doc(tutorId).update({
    rating,
    reviewCount,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function createStudentReview(input: {
  actorUid: string;
  bookingId: string;
  tutorId: string;
  rating: number;
  comment: string;
}): Promise<CreateReviewResult> {
  const db = getAdminFirestore();
  const result = await createReviewForStudent(db, input, {
    timestamp: FieldValue.serverTimestamp(),
  });
  try {
    await recomputeTutorRating(result.tutorId);
  } catch {
    // The review is already persisted; rating can be repaired via recompute-rating.
  }
  return result;
}
