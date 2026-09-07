export const ADMIN_ROUTE_PREFIX = "/admin";

/** Route prefixes guarded by session middleware (exact path or nested segment). */
export const PROTECTED_ROUTE_PREFIXES = [
  ADMIN_ROUTE_PREFIX,
  "/dashboard",
  "/bookings",
  "/aulas",
  "/mensagens",
  "/configuracoes",
  "/facilitador",
  "/account/setup",
  "/tutor/dashboard",
  "/tutor/settings",
  "/tutor/onboarding",
  "/verify-email",
] as const;

export function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix));
}

export function isEmailVerificationExemptPath(pathname: string): boolean {
  return (
    matchesRoutePrefix(pathname, "/verify-email") || matchesRoutePrefix(pathname, "/account/setup")
  );
}

export function shouldDenyAdminAccess(pathname: string, role?: string): boolean {
  return pathname.startsWith(ADMIN_ROUTE_PREFIX) && role !== "admin";
}

export function shouldRedirectUnverifiedEmail(
  pathname: string,
  emailVerified?: boolean,
): boolean {
  if (emailVerified !== false) {
    return false;
  }
  if (isEmailVerificationExemptPath(pathname)) {
    return false;
  }
  if (pathname.startsWith("/api/")) {
    return false;
  }
  return true;
}
