import {
  postLoginDestination,
  signupDestinationForRole,
} from "@/lib/auth/account-setup";
import { normalizeRole, type ProfileRole } from "@/lib/auth/roles";
import type { UserDoc } from "@/lib/auth/types";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";

export { postLoginDestination, signupDestinationForRole } from "@/lib/auth/account-setup";

/**
 * Canonical post-login / post-signup destinations.
 *
 * New accounts enter account setup before the dashboard. Returning users are
 * routed through `postLoginDestination`, which checks setup completion.
 *
 * `panelPathForRole` is the authenticated home link (navbar "Meu painel").
 */
export function postAuthPathForRole(role: ProfileRole | null | undefined): string {
  return signupDestinationForRole(role);
}

export function resolvePostAuthDestination(input: {
  role: ProfileRole | null | undefined;
  userDoc?: UserDoc | null;
  learningProfile?: StudentLearningProfile | null;
  tutorDoc?: FirestoreTutorDoc | null;
  requestedPath?: string | null;
}): string {
  return postLoginDestination(input);
}

/** @deprecated Prefer `signupDestinationForRole` or `postLoginDestination`. */
export function legacyPostAuthPathForRole(role: ProfileRole | null | undefined): string {
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
