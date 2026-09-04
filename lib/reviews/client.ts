import {
  collection,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db, requireFirebaseApp, whenFirebaseReady } from "@/lib/firebase/client";
import { requestNotification } from "@/lib/notifications/client";
import type { CreateReviewInput, PublicTutorReview } from "@/lib/reviews/types";

/**
 * Hostinger production has no Next.js Server Actions. Call the Express route
 * POST /api/reviews (server/api/reviews.js). The same path is served by
 * app/api/reviews/route.ts on Vercel / next start.
 */
export async function createReview(input: CreateReviewInput): Promise<string> {
  await requireFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Faça login para enviar a avaliação.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/reviews", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      bookingId: input.bookingId,
      tutorId: input.tutorId,
      rating: input.rating,
      comment: input.comment,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; reviewId?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível enviar a avaliação.");
  }

  const reviewId = payload?.reviewId || input.bookingId;
  void requestNotification({ type: "new_review", reviewId });
  return reviewId;
}

/**
 * Loads public tutor reviews via the server API so student identifiers
 * never appear on marketplace pages.
 */
export function subscribeToTutorReviews(
  tutorId: string,
  onChange: (reviews: PublicTutorReview[]) => void,
  onError?: (error: Error) => void,
): () => void {
  let cancelled = false;

  void fetch(`/api/reviews?tutorId=${encodeURIComponent(tutorId)}`)
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as {
        reviews?: PublicTutorReview[];
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Não foi possível carregar as avaliações.");
      }

      if (!cancelled) {
        onChange(Array.isArray(payload?.reviews) ? payload.reviews : []);
      }
    })
    .catch((error: unknown) => {
      if (!cancelled) {
        onError?.(
          error instanceof Error ? error : new Error("Não foi possível carregar as avaliações."),
        );
      }
    });

  return () => {
    cancelled = true;
  };
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
          snapshot.docs.map((docSnap) => {
            const bookingId = docSnap.data().bookingId as string | undefined;
            return bookingId || docSnap.id;
          }),
        );
        onChange(bookingIds);
      },
      (error) => onError?.(error),
    );
  });
}
