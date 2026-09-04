import { isLecturerRole, normalizeRole, type ProfileRole } from "@/lib/auth/roles";
import { panelLabelForRole, panelPathForRole } from "@/lib/auth/redirects";

function toProfileRole(role: string | null | undefined): ProfileRole | null | undefined {
  return normalizeRole(role) ?? (role as ProfileRole | null | undefined);
}

/**
 * Compatibility helpers for navbar and logged-in shortcuts.
 * Canonical routing lives in `lib/auth/redirects.ts`.
 */
export function getDashboardPath(role: string | null | undefined): string {
  return panelPathForRole(toProfileRole(role));
}

export function getDashboardLabel(role: string | null | undefined): string {
  return panelLabelForRole(toProfileRole(role));
}

export function shouldShowBecomeTutorNav(role: string | null | undefined): boolean {
  return !isLecturerRole(role);
}
