import { normalizeRole, type ProfileRole } from "@/lib/auth/roles";

/**
 * Canonical post-login / post-signup destinations.
 *
 * Lecturers always enter through `/tutor/onboarding`. That page already
 * replaces to `/tutor/dashboard` when the professor profile is complete,
 * so this remains the safe post-auth path without a second completeness check.
 *
 * `panelPathForRole` is the authenticated home link (navbar "Meu painel").
 */
export function postAuthPathForRole(role: ProfileRole | null | undefined): string {
  switch (normalizeRole(role)) {
    case "lecturer":
      return "/tutor/onboarding";
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

export function panelPathForRole(role: ProfileRole | null | undefined): string {
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

export function signupPathForRole(role?: string | null): string {
  return role === "tutor" ? "/signup?role=tutor" : "/signup";
}

export interface PrimaryNavItem {
  href: string;
  label: string;
}

export function primaryNavItemsForRole(
  role: ProfileRole | null | undefined,
): PrimaryNavItem[] {
  switch (normalizeRole(role)) {
    case "student":
      return [
        { href: "/dashboard", label: "Início" },
        { href: "/search", label: "Encontrar Professor" },
        { href: "/bookings", label: "Minhas Aulas" },
        { href: "/mensagens", label: "Mensagens" },
      ];
    case "lecturer":
      return [
        { href: "/tutor/dashboard", label: "Início" },
        { href: "/tutor/dashboard#solicitacoes", label: "Solicitações" },
        { href: "/bookings", label: "Minhas Aulas" },
        { href: "/tutor/dashboard#alunos", label: "Meus Alunos" },
        { href: "/tutor/dashboard#turmas", label: "Turmas" },
        { href: "/mensagens", label: "Mensagens" },
        { href: "/tutor/dashboard#ganhos", label: "Ganhos" },
        { href: "/tutor/settings", label: "Meu Perfil" },
      ];
    case "facilitator":
      return [
        { href: "/", label: "Início" },
        { href: "/facilitador", label: "Painel do Facilitador" },
      ];
    case "admin":
      return [{ href: "/admin", label: "Painel admin" }];
    default:
      return [];
  }
}

export function panelLabelForRole(role: ProfileRole | null | undefined): string {
  switch (normalizeRole(role)) {
    case "admin":
      return "Painel admin";
    case "facilitator":
      return "Painel do Facilitador";
    default:
      return "Meu painel";
  }
}
