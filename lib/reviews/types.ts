import type { Timestamp } from "firebase/firestore";

export interface Review {
  id: string;
  tutorId: string;
  studentId: string;
  bookingId: string;
  rating: number;
  comment: string;
  createdAt: Timestamp;
}

export interface CreateReviewInput {
  tutorId: string;
  studentId: string;
  bookingId: string;
  rating: number;
  comment: string;
}
