import type { ProfileRole } from "@/lib/auth/roles";
import { getDashboardPath } from "@/lib/auth/dashboard";

/** First destination after signup — professors finish onboarding before the dashboard. */
export function postAuthPathForRole(role: ProfileRole | null | undefined): string {
  return role === "tutor" || role === "lecturer" ? "/tutor/onboarding" : getDashboardPath(role);
}

export function signupPathForRole(role?: string | null): string {
  return role === "tutor" ? "/signup?role=tutor" : "/signup";
}
