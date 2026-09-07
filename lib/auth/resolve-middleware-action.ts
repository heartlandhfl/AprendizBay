import {
  isProtectedPath,
  shouldDenyAdminAccess,
  shouldRedirectUnverifiedEmail,
} from "@/lib/auth/protected-routes";

export interface MiddlewareSession {
  role?: string;
  emailVerified?: boolean;
}

export type MiddlewareDecision =
  | { action: "allow" }
  | { action: "login"; clearSession: boolean }
  | { action: "redirect"; pathname: string };

export function resolveMiddlewareDecision(input: {
  pathname: string;
  hasSessionCookie: boolean;
  session: MiddlewareSession | null;
}): MiddlewareDecision {
  if (!isProtectedPath(input.pathname)) {
    return { action: "allow" };
  }

  if (!input.hasSessionCookie) {
    return { action: "login", clearSession: false };
  }

  if (!input.session) {
    return { action: "login", clearSession: true };
  }

  if (shouldDenyAdminAccess(input.pathname, input.session.role)) {
    return { action: "redirect", pathname: "/" };
  }

  if (shouldRedirectUnverifiedEmail(input.pathname, input.session.emailVerified)) {
    return { action: "redirect", pathname: "/verify-email" };
  }

  return { action: "allow" };
}
