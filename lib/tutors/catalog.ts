import { rejectMockTutorInventory } from "@/lib/tutors/mock-identities";
import type { MockTutorEnv } from "@/lib/tutors/mock-gate";

export type TutorCatalogState = "ok" | "empty" | "unavailable" | "error";
export type TutorProfileState = "ok" | "not_found" | "unavailable" | "error";
export type HubLoadState = "ok" | "empty" | "not_found" | "unavailable" | "error";

export interface TutorListResult<T> {
  state: TutorCatalogState;
  items: T[];
}

export interface TutorProfileResult<T> {
  state: TutorProfileState;
  tutor?: T;
}

export interface HubListResult<T> {
  state: TutorCatalogState;
  items: T[];
}

export interface HubItemResult<T> {
  state: HubLoadState;
  hub: T | null;
}

export const TUTOR_CATALOG_COPY = {
  unavailable: {
    title: "Serviço temporariamente indisponível",
    description:
      "Não conseguimos carregar os professores agora. Tente novamente em alguns instantes.",
  },
  error: {
    title: "Erro ao carregar os professores",
    description: "Ocorreu um problema ao buscar os dados. Tente novamente em instantes.",
  },
  empty: {
    title: "Nenhum professor encontrado",
    description: "Ainda não há professores verificados para exibir.",
  },
} as const;

export const TUTOR_PROFILE_COPY = {
  unavailable: {
    title: "Não foi possível carregar o perfil",
    description:
      "O serviço está temporariamente indisponível. Tente novamente em instantes.",
  },
  error: {
    title: "Erro ao carregar o perfil",
    description: "Ocorreu um problema ao buscar este professor. Tente novamente em instantes.",
  },
} as const;

export const HUB_CATALOG_COPY = {
  unavailable: {
    title: "Serviço temporariamente indisponível",
    description:
      "Não conseguimos carregar as turmas coletivas agora. Tente novamente em alguns instantes.",
  },
  error: {
    title: "Erro ao carregar as turmas",
    description: "Ocorreu um problema ao buscar as aulas coletivas. Tente novamente em instantes.",
  },
} as const;

export function okTutorList<T>(items: T[]): TutorListResult<T> {
  return items.length === 0 ? { state: "empty", items: [] } : { state: "ok", items };
}

export function failedTutorList<T>(
  state: Exclude<TutorCatalogState, "ok">,
): TutorListResult<T> {
  return { state, items: [] };
}

export function resolveFailedTutorCatalog<T>(
  failure: "unavailable" | "error",
  options: { mocksEnabled: boolean; mockItems: T[] },
): TutorListResult<T> {
  if (options.mocksEnabled) {
    return okTutorList(options.mockItems);
  }

  return failedTutorList(failure);
}

export function resolveFailedTutorProfile<T>(
  failure: "unavailable" | "error",
  options: { mocksEnabled: boolean; mockTutor: T | undefined },
): TutorProfileResult<T> {
  if (options.mocksEnabled && options.mockTutor) {
    return { state: "ok", tutor: options.mockTutor };
  }

  return { state: failure };
}

export function resolveFailedHubList<T>(
  failure: "unavailable" | "error",
  options: { mocksEnabled: boolean; mockItems: T[] },
): HubListResult<T> {
  return resolveFailedTutorCatalog(failure, options);
}

export function resolveFailedHubItem<T>(
  failure: "unavailable" | "error",
  options: { mocksEnabled: boolean; mockHub: T | null | undefined },
): HubItemResult<T> {
  if (options.mocksEnabled && options.mockHub) {
    return { state: "ok", hub: options.mockHub };
  }

  return { state: failure, hub: null };
}

export function tutorsForPublicPages<T>(
  catalog: TutorListResult<T>,
  env: MockTutorEnv = process.env,
): T[] {
  if (catalog.state === "unavailable" || catalog.state === "error") {
    return [];
  }

  return rejectMockTutorInventory(catalog.items, env);
}

export function isCatalogProblem(
  state: TutorCatalogState | TutorProfileState | HubLoadState,
): state is "unavailable" | "error" {
  return state === "unavailable" || state === "error";
}
