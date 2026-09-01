import type { Timestamp } from "firebase/firestore";

export type SignupRole = "student" | "tutor";

export type UserRole = SignupRole | "admin";

/**
 * Private account document at users/{uid}.
 * Public: displayName, photoUrl (also copied to users/{uid}/public/profile)
 * Private: email, createdAt, updatedAt
 * Security-sensitive / admin: role
 */
export interface UserDoc {
  role: UserRole;
  displayName: string;
  email: string;
  photoUrl?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
