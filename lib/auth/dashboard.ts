import { isLecturerRole } from "@/lib/auth/roles";
import { panelLabelForRole, panelPathForRole } from "@/lib/auth/redirects";

/**
 * Compatibility helpers for navbar and logged-in shortcuts.
 * Canonical routing lives in `lib/auth/redirects.ts`.
 */
export function getDashboardPath(role: string | null | undefined): string {
  return panelPathForRole(role);
}

export function getDashboardLabel(role: string | null | undefined): string {
  return panelLabelForRole(role);
}

export function shouldShowBecomeTutorNav(role: string | null | undefined): boolean {
  return !isLecturerRole(role);
}
