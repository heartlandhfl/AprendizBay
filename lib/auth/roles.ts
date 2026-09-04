/**
 * Canonical AprendizBay role model.
 *
 * Privileged authorization uses Firebase Auth custom claims (`request.auth.token.role`).
 * The Firestore `users/{uid}.role` field is application profile metadata and must stay
 * in sync via trusted server-side code — never trusted for privileged access.
 *
 * Internal identifiers:
 *   student | lecturer | admin | facilitator | support
 *
 * Legacy profile value `tutor` is equivalent to `lecturer` (professor signup path).
 * UI displays "Professor" for lecturer/tutor — see roleDisplayLabel().
 */

export const CANONICAL_ROLES = [
  "student",
  "lecturer",
  "admin",
  "facilitator",
  "support",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

/** Roles that may only be granted through Firebase Admin custom claims. */
export const PRIVILEGED_ROLES = [
  "admin",
  "lecturer",
  "facilitator",
  "support",
] as const;

export type PrivilegedRole = (typeof PRIVILEGED_ROLES)[number];

/** Self-service signup paths (Firestore profile only until server sync). */
export const SIGNUP_ROLES = ["student", "tutor"] as const;

export type SignupRole = (typeof SIGNUP_ROLES)[number];

/**
 * Profile roles stored in Firestore — includes legacy `tutor` alias for lecturer.
 */
export type ProfileRole = CanonicalRole | "tutor";

export type UserRole = ProfileRole;

export function isCanonicalRole(value: string): value is CanonicalRole {
  return (CANONICAL_ROLES as readonly string[]).includes(value);
}

export function isPrivilegedRole(value: string): value is PrivilegedRole {
  return (PRIVILEGED_ROLES as readonly string[]).includes(value);
}

export function isSignupRole(value: string): value is SignupRole {
  return (SIGNUP_ROLES as readonly string[]).includes(value);
}

/**
 * Maps legacy `tutor` profile values to the canonical `lecturer` identifier.
 */
export function normalizeRole(
  role: string | null | undefined,
): CanonicalRole | null {
  if (!role || typeof role !== "string") {
    return null;
  }

  if (role === "tutor") {
    return "lecturer";
  }

  return isCanonicalRole(role) ? role : null;
}

/**
 * Profile role written alongside custom claims (keeps legacy `tutor` out of new writes).
 */
export function profileRoleForCanonical(role: CanonicalRole): ProfileRole {
  return role;
}

/** Portuguese UI label for account role. */
export function roleDisplayLabel(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "lecturer":
      return "Professor";
    case "student":
      return "Aluno";
    case "admin":
      return "Administrador";
    case "facilitator":
      return "Facilitador";
    case "support":
      return "Suporte";
    default:
      return "Usuário";
  }
}

export function isLecturerRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "lecturer";
}

export function isStudentRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "student";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "admin";
}

export function isFacilitatorRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "facilitator";
}

export function isSupportRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "support";
}

/**
 * Authorization check that treats legacy `tutor` as `lecturer`.
 * Pass canonical roles in route guards (`["lecturer"]`, `["admin"]`, …);
 * stored profile values of `tutor` still satisfy lecturer-only routes.
 */
export function roleMatchesAny(
  actual: string | null | undefined,
  allowed: readonly string[] | null | undefined,
): boolean {
  if (!allowed || allowed.length === 0) {
    return true;
  }

  const normalizedActual = normalizeRole(actual);
  if (!normalizedActual) {
    return false;
  }

  return allowed.some((role) => normalizeRole(role) === normalizedActual);
}
