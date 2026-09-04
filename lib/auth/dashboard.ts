import { isLecturerRole, normalizeRole } from "@/lib/auth/roles";

/**
 * Default post-auth destination for each account role.
 */
export function getDashboardPath(role: string | null | undefined): string {
  switch (normalizeRole(role)) {
    case "lecturer":
      return "/tutor/dashboard";
    case "admin":
      return "/admin";
    case "facilitator":
      return "/facilitador";
    case "student":
      return "/bookings";
    default:
      return "/";
  }
}

export function getDashboardLabel(role: string | null | undefined): string {
  switch (normalizeRole(role)) {
    case "admin":
      return "Painel admin";
    case "facilitator":
      return "Painel facilitador";
    case "lecturer":
      return "Meu painel";
    case "student":
      return "Minhas aulas";
    default:
      return "Meu painel";
  }
}

export function shouldShowBecomeTutorNav(role: string | null | undefined): boolean {
  return !isLecturerRole(role);
}
