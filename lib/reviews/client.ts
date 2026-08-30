import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db, requireFirebaseApp, whenFirebaseReady } from "@/lib/firebase/client";
import type { CreateReviewInput } from "@/lib/reviews/types";

export async function createReview(input: CreateReviewInput): Promise<string> {
  await requireFirebaseApp();
  const docRef = await addDoc(collection(db, "reviews"), {
    tutorId: input.tutorId,
    studentId: input.studentId,
    bookingId: input.bookingId,
    rating: input.rating,
    comment: input.comment.trim(),
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Hostinger production has no Next.js Server Actions. Call the Express route
 * POST /api/reviews/recompute-rating (server/api/reviews.js). The same path
 * is served by app/api/reviews/recompute-rating on Vercel / next start.
 */
export async function recomputeTutorRating(tutorId: string): Promise<void> {
  await requireFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para atualizar a nota do professor.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/reviews/recompute-rating", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ tutorId }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível atualizar a nota do professor.");
  }
}

export function subscribeToStudentReviewBookingIds(
  studentId: string,
  onChange: (bookingIds: Set<string>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(() => {
    const reviewsQuery = query(
      collection(db, "reviews"),
      where("studentId", "==", studentId),
    );

    return onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const bookingIds = new Set(
          snapshot.docs.map((docSnap) => docSnap.data().bookingId as string),
        );
        onChange(bookingIds);
      },
      (error) => onError?.(error),
    );
  });
}
