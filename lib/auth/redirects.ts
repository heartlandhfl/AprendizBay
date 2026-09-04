import type { ProfileRole } from "@/lib/auth/roles";

export function postAuthPathForRole(role: ProfileRole | null | undefined): string {
  if (role === "tutor" || role === "lecturer") {
    return "/tutor/onboarding";
  }
  if (role === "student") {
    return "/dashboard";
  }
  return "/bookings";
}

export function signupPathForRole(role?: string | null): string {
  return role === "tutor" ? "/signup?role=tutor" : "/signup";
}
