import { accountSetupRedirectTarget } from "@/lib/auth/account-setup";
import { roleMatchesAny } from "@/lib/auth/roles";
import type { UserDoc, UserRole } from "@/lib/auth/types";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";

export interface AuthGateUser {
  uid: string;
  emailVerified?: boolean;
  providerData?: Array<{ providerId: string }>;
}

export interface AuthGateOptions {
  roles?: UserRole[];
  redirectTo: string;
  unauthorizedRedirectTo: string;
  skipSetupGate: boolean;
  skipEmailVerification: boolean;
}

export interface AuthGateContext {
  options: AuthGateOptions;
  user: AuthGateUser | null;
  userDoc: UserDoc | null;
  loading: boolean;
  tokenRole: string | null;
  claimsLoading: boolean;
  pathname: string;
  searchParams: URLSearchParams;
  setupLoading: boolean;
  learningProfile: StudentLearningProfile | null;
  tutorDoc: FirestoreTutorDoc | null;
}

function usesPasswordProvider(user: AuthGateUser): boolean {
  return user.providerData?.some((provider) => provider.providerId === "password") ?? false;
}

export function requiresAdminClaim(roles?: UserRole[]): boolean {
  return !!roles?.includes("admin");
}

export function computeHasRoleMismatch(context: AuthGateContext): boolean {
  const { roles } = context.options;
  const adminClaimRequired = requiresAdminClaim(roles);

  if (adminClaimRequired) {
    return !!context.user && context.tokenRole !== "admin";
  }

  return !!roles && !!context.userDoc && !roleMatchesAny(context.userDoc.role, roles);
}

export function computeMissingProfileForRoleGate(context: AuthGateContext): boolean {
  const { roles } = context.options;
  return (
    !!roles &&
    !!context.user &&
    !context.loading &&
    !context.userDoc &&
    !requiresAdminClaim(roles)
  );
}

export function computeNeedsEmailVerification(context: AuthGateContext): boolean {
  const { skipEmailVerification } = context.options;
  const user = context.user;

  return (
    !skipEmailVerification &&
    !!user &&
    !user.emailVerified &&
    usesPasswordProvider(user) &&
    context.pathname !== "/verify-email"
  );
}

export function buildLoginRedirectUrl(
  pathname: string,
  searchParams: URLSearchParams,
  redirectTo: string,
): string {
  const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  if (nextPath === "/") {
    return redirectTo;
  }
  return `${redirectTo}?redirect=${encodeURIComponent(nextPath)}`;
}

export function resolveAuthRedirectUrl(context: AuthGateContext): string | null {
  const { options, user, userDoc } = context;

  if (!user) {
    return buildLoginRedirectUrl(context.pathname, context.searchParams, options.redirectTo);
  }

  if (computeNeedsEmailVerification(context)) {
    return "/verify-email";
  }

  if (computeHasRoleMismatch(context)) {
    return options.unauthorizedRedirectTo;
  }

  if (computeMissingProfileForRoleGate(context)) {
    return options.redirectTo;
  }

  if (options.skipSetupGate || context.setupLoading || !userDoc) {
    return null;
  }

  const setupRedirect = accountSetupRedirectTarget({
    pathname: context.pathname,
    role: userDoc.role,
    userDoc,
    learningProfile: context.learningProfile,
    tutorDoc: context.tutorDoc,
  });

  if (setupRedirect && setupRedirect !== context.pathname) {
    return setupRedirect;
  }

  return null;
}

export function computeIsAuthorized(context: AuthGateContext): boolean {
  const { roles } = context.options;
  const adminClaimRequired = requiresAdminClaim(roles);

  if (adminClaimRequired) {
    return !!context.user && context.tokenRole === "admin";
  }

  return (
    !!context.user && (!roles || (!!context.userDoc && roleMatchesAny(context.userDoc.role, roles)))
  );
}

export function computeAuthLoading(
  context: AuthGateContext,
  redirecting: boolean,
  isAuthorized: boolean,
): boolean {
  const { roles, skipSetupGate } = context.options;
  const adminClaimRequired = requiresAdminClaim(roles);

  return (
    context.loading ||
    context.claimsLoading ||
    redirecting ||
    (!skipSetupGate && context.setupLoading) ||
    (!!context.user && !!roles && !adminClaimRequired && !context.userDoc) ||
    !isAuthorized
  );
}

export function shouldDeferAuthRedirect(context: AuthGateContext, redirecting: boolean): boolean {
  return context.loading || redirecting || context.claimsLoading;
}
