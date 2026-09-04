import {
  isAdminRole,
  isFacilitatorRole,
  isLecturerRole,
  isStudentRole,
  isSupportRole,
  normalizeRole,
  type ProfileRole,
} from "@/lib/auth/roles";
import type { UserDoc } from "@/lib/auth/types";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";
import { isStudentLearningProfileComplete } from "@/lib/student-dashboard/profile";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";
import { computeTutorProfileCompletion } from "@/lib/tutors/profile-completion";

export const STUDENT_ACCOUNT_SETUP_PATH = "/account/setup";
export const LECTURER_ACCOUNT_SETUP_PATH = "/tutor/onboarding";

const AUTH_ENTRY_PATHS = new Set(["/login", "/signup"]);
const LEGAL_PATHS = new Set(["/termos", "/privacidade"]);
const SETUP_PATHS = new Set([STUDENT_ACCOUNT_SETUP_PATH, LECTURER_ACCOUNT_SETUP_PATH]);

const PUBLIC_BROWSE_PREFIXES = [
  "/professores",
  "/turmas",
  "/seja-professor",
  "/como-funciona",
  "/contato",
  "/ajuda",
  "/aulas-coletivas",
  "/r/",
] as const;

const LECTURER_APP_PREFIXES = ["/tutor/dashboard", "/tutor/settings"] as const;

const SHARED_APP_PREFIXES = ["/bookings", "/aulas", "/mensagens", "/configuracoes"] as const;

const STUDENT_APP_PREFIXES = ["/dashboard", "/search", ...SHARED_APP_PREFIXES] as const;

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function homePathForRole(role: ProfileRole | null | undefined): string {
  switch (normalizeRole(role)) {
    case "lecturer":
      return "/tutor/dashboard";
    case "student":
      return "/dashboard";
    case "facilitator":
      return "/facilitador";
    case "admin":
      return "/admin";
    case "support":
      return "/";
    default:
      return "/";
  }
}

export function isStudentBasicProfileComplete(
  userDoc: UserDoc | null | undefined,
  profile: StudentLearningProfile | null | undefined,
): boolean {
  if (!hasText(userDoc?.displayName)) {
    return false;
  }

  if (!hasText(profile?.city)) {
    return false;
  }

  if (!hasText(profile?.state)) {
    return false;
  }

  if (!hasText(profile?.phone)) {
    return false;
  }

  return true;
}

export function isStudentLearningSetupComplete(
  profile: StudentLearningProfile | null | undefined,
): boolean {
  if (!hasText(profile?.preferredSubject)) {
    return false;
  }

  if (!hasText(profile?.preferredLevel)) {
    return false;
  }

  if (!profile?.preferredModality) {
    return false;
  }

  if (
    (profile.preferredModality === "presencial" || profile.preferredModality === "ambos") &&
    !hasText(profile.preferredCity)
  ) {
    return false;
  }

  if (!hasText(profile?.learningObjective)) {
    return false;
  }

  return true;
}

/**
 * Full Phase A student setup requires basic account fields plus learning preferences.
 * Legacy students who completed the previous learning profile flow remain eligible.
 */
export function isStudentAccountSetupComplete(
  userDoc: UserDoc | null | undefined,
  profile: StudentLearningProfile | null | undefined,
): boolean {
  if (isStudentBasicProfileComplete(userDoc, profile) && isStudentLearningSetupComplete(profile)) {
    return true;
  }

  return isStudentLearningProfileComplete(profile);
}

export function isLecturerAccountSetupComplete(
  tutorDoc: FirestoreTutorDoc | null | undefined,
): boolean {
  return computeTutorProfileCompletion(tutorDoc).percentage === 100;
}

export function isAccountSetupComplete(input: {
  role: ProfileRole | null | undefined;
  userDoc?: UserDoc | null;
  learningProfile?: StudentLearningProfile | null;
  tutorDoc?: FirestoreTutorDoc | null;
}): boolean {
  const role = normalizeRole(input.role);

  if (isStudentRole(role)) {
    return isStudentAccountSetupComplete(input.userDoc, input.learningProfile);
  }

  if (isLecturerRole(role)) {
    return isLecturerAccountSetupComplete(input.tutorDoc);
  }

  if (isAdminRole(role) || isSupportRole(role) || isFacilitatorRole(role)) {
    return true;
  }

  return true;
}

export function accountSetupPathForRole(role: ProfileRole | null | undefined): string | null {
  switch (normalizeRole(role)) {
    case "student":
      return STUDENT_ACCOUNT_SETUP_PATH;
    case "lecturer":
      return LECTURER_ACCOUNT_SETUP_PATH;
    default:
      return null;
  }
}

export function signupDestinationForRole(role: ProfileRole | null | undefined): string {
  const setupPath = accountSetupPathForRole(role);
  if (setupPath) {
    return setupPath;
  }

  return homePathForRole(role);
}

export interface PostLoginDestinationInput {
  role: ProfileRole | null | undefined;
  userDoc?: UserDoc | null;
  learningProfile?: StudentLearningProfile | null;
  tutorDoc?: FirestoreTutorDoc | null;
  requestedPath?: string | null;
}

export function postLoginDestination(input: PostLoginDestinationInput): string {
  const role = normalizeRole(input.role);
  const setupPath = accountSetupPathForRole(role);
  const homePath = homePathForRole(role);
  const complete = isAccountSetupComplete({
    role,
    userDoc: input.userDoc,
    learningProfile: input.learningProfile,
    tutorDoc: input.tutorDoc,
  });

  if (!complete && setupPath) {
    return setupPath;
  }

  const requestedPath = input.requestedPath?.trim();
  if (requestedPath && requestedPath.startsWith("/") && !requestedPath.startsWith("//")) {
    return requestedPath;
  }

  return homePath;
}

export function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PATHS.has(pathname);
}

export function isLegalPath(pathname: string): boolean {
  return LEGAL_PATHS.has(pathname);
}

export function isAccountSetupPath(pathname: string): boolean {
  return SETUP_PATHS.has(pathname);
}

export function isPublicTutorProfilePath(pathname: string): boolean {
  return (
    /^\/tutor\/[^/]+$/.test(pathname) &&
    pathname !== "/tutor/dashboard" &&
    pathname !== "/tutor/onboarding" &&
    pathname !== "/tutor/settings"
  );
}

export function isPublicBrowsePath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  if (isPublicTutorProfilePath(pathname)) {
    return true;
  }

  return PUBLIC_BROWSE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isSetupExemptPath(pathname: string): boolean {
  return (
    isAuthEntryPath(pathname) ||
    isLegalPath(pathname) ||
    isAccountSetupPath(pathname) ||
    isPublicBrowsePath(pathname)
  );
}

export function shouldEnforceAccountSetup(pathname: string, role: ProfileRole | null | undefined): boolean {
  const normalizedRole = normalizeRole(role);

  if (!isStudentRole(normalizedRole) && !isLecturerRole(normalizedRole)) {
    return false;
  }

  if (isSetupExemptPath(pathname)) {
    return false;
  }

  if (isStudentRole(normalizedRole)) {
    return STUDENT_APP_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }

  if (isLecturerRole(normalizedRole)) {
    return (
      LECTURER_APP_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      ) ||
      SHARED_APP_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      )
    );
  }

  return false;
}

export function accountSetupRedirectTarget(input: {
  pathname: string;
  role: ProfileRole | null | undefined;
  userDoc?: UserDoc | null;
  learningProfile?: StudentLearningProfile | null;
  tutorDoc?: FirestoreTutorDoc | null;
}): string | null {
  const role = normalizeRole(input.role);
  const setupPath = accountSetupPathForRole(role);
  const homePath = homePathForRole(role);
  const complete = isAccountSetupComplete({
    role,
    userDoc: input.userDoc,
    learningProfile: input.learningProfile,
    tutorDoc: input.tutorDoc,
  });

  if (isAccountSetupPath(input.pathname)) {
    return complete ? homePath : null;
  }

  if (!complete && setupPath && shouldEnforceAccountSetup(input.pathname, role)) {
    return setupPath;
  }

  return null;
}
