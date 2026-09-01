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

function toReviewDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  return null;
}

export function subscribeToTutorReviews(
  tutorId: string,
  onChange: (reviews: PublicTutorReview[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(
    () => {
      const reviewsQuery = query(collection(db, "reviews"), where("tutorId", "==", tutorId));

      return onSnapshot(
        reviewsQuery,
        (snapshot) => {
          const reviews = snapshot.docs
            .map((docSnap) => {
              const data = docSnap.data();
              const rating = data.rating;
              const comment = typeof data.comment === "string" ? data.comment.trim() : "";

              if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5) {
                return null;
              }

              return {
                id: docSnap.id,
                rating,
                comment,
                createdAt: toReviewDate(data.createdAt),
              } satisfies PublicTutorReview;
            })
            .filter((review): review is PublicTutorReview => review !== null)
            .sort((left, right) => {
              const leftTime = left.createdAt?.getTime() ?? 0;
              const rightTime = right.createdAt?.getTime() ?? 0;
              return rightTime - leftTime;
            });

          onChange(reviews);
        },
        (error) => onError?.(error),
      );
    },
    () => onChange([]),
  );
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
