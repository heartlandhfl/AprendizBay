import type { ProfileRole } from "@/lib/auth/roles";

export function postAuthPathForRole(role: ProfileRole | null | undefined): string {
  return role === "tutor" || role === "lecturer" ? "/tutor/onboarding" : "/bookings";
}

export function signupPathForRole(role?: string | null): string {
  return role === "tutor" ? "/signup?role=tutor" : "/signup";
}
