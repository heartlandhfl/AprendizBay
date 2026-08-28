import type { Timestamp } from "firebase/firestore";

export type SignupRole = "student" | "tutor";

export type UserRole = SignupRole | "admin";

export interface UserDoc {
  role: SignupRole;
  displayName: string;
  email: string;
  photoUrl?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
