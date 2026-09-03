import type { Timestamp } from "firebase/firestore";

export type {
  CanonicalRole,
  PrivilegedRole,
  ProfileRole,
  SignupRole,
  UserRole,
} from "@/lib/auth/roles";

export { roleDisplayLabel, normalizeRole, isLecturerRole } from "@/lib/auth/roles";

/**
 * Private account document at users/{uid}.
 * Public: displayName, photoUrl (also copied to users/{uid}/public/profile)
 * Private: email, createdAt, updatedAt
 * Profile metadata: role (synced from custom claims for privileged roles)
 */
export interface UserDoc {
  role: import("@/lib/auth/roles").ProfileRole;
  displayName: string;
  email: string;
  photoUrl?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
