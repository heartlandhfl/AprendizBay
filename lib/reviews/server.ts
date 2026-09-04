/**
 * Hostinger audit — firebase-admin (Next.js server modules)
 *
 * Used by app/api/reviews/route.ts and
 * app/api/reviews/recompute-rating/route.ts on Vercel / next start.
 *
 * Production Hostinger does not execute this module. Express serves the same
 * create and admin-only recompute via POST /api/reviews and
 * POST /api/reviews/recompute-rating (server/api/reviews.js),
 * which lazy-load firebase-admin from server/api/firebase-admin.js.
 *
 * Do not import this file from server.js. Express must use server/api/reviews.js.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  createReviewAndRefreshTutorRating,
  recomputeTutorRating as recomputeTutorRatingFromReviews,
  type CreateReviewResult,
} from "@/lib/reviews/create-review";
import type { PublicTutorReview } from "@/lib/reviews/types";

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
  await recomputeTutorRatingFromReviews(db, tutorId, {
    timestamp: FieldValue.serverTimestamp(),
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
  return createReviewAndRefreshTutorRating(db, input, {
    timestamp: FieldValue.serverTimestamp(),
  });
}

export async function listPublicTutorReviews(tutorId: string): Promise<PublicTutorReview[]> {
  const db = getAdminFirestore();
  const normalizedTutorId = tutorId.trim();
  if (!normalizedTutorId) {
    return [];
  }

  const snapshot = await db
    .collection("reviews")
    .where("tutorId", "==", normalizedTutorId)
    .get();

  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data();
      const rating = data.rating;
      const comment = typeof data.comment === "string" ? data.comment.trim() : "";
      if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5) {
        return null;
      }

      const createdAtRaw = data.createdAt;
      const createdAt =
        createdAtRaw && typeof createdAtRaw.toDate === "function"
          ? createdAtRaw.toDate()
          : createdAtRaw instanceof Date
            ? createdAtRaw
            : null;

      return {
        id: docSnap.id,
        rating,
        comment,
        createdAt,
      } satisfies PublicTutorReview;
    })
    .filter((review): review is PublicTutorReview => review !== null)
    .sort((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0));
}
