import type { User } from "firebase/auth";
import {
  isPrivilegedRole,
  normalizeRole,
  type CanonicalRole,
  type ProfileRole,
} from "@/lib/auth/roles";

/**
 * Reads the privileged role from Firebase Auth custom claims on the client.
 * Pass forceRefresh after claims change (bootstrap-admin, manage-role) so
 * session cookies and route guards see the updated role.
 */
export async function readTokenRole(
  user: User,
  forceRefresh = false,
): Promise<CanonicalRole | null> {
  if (forceRefresh) {
    await user.getIdToken(true);
  }

  const result = await user.getIdTokenResult();
  const claim = result.claims.role;
  return typeof claim === "string" ? normalizeRole(claim) : null;
}

export async function hasAdminClaim(user: User, forceRefresh = false): Promise<boolean> {
  return (await readTokenRole(user, forceRefresh)) === "admin";
}

/**
 * Privileged routing prefers custom claims. Firestore profile metadata is used
 * only for self-service roles (student, lecturer/tutor signup path).
 */
export function resolveAuthoritativeRole(
  profileRole: ProfileRole | string | null | undefined,
  tokenRole: CanonicalRole | null,
): CanonicalRole | null {
  if (tokenRole) {
    return tokenRole;
  }

  const profile = normalizeRole(profileRole);
  if (!profile) {
    return null;
  }

  if (isPrivilegedRole(profile)) {
    return profile === "lecturer" ? profile : "student";
  }

  return profile;
}
