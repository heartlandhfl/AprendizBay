import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { CreateReviewInput } from "@/lib/reviews/types";

export async function createReview(input: CreateReviewInput): Promise<string> {
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

export function subscribeToStudentReviewBookingIds(
  studentId: string,
  onChange: (bookingIds: Set<string>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
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
}
