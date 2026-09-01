import type { Tutor } from "@/lib/mock-tutors";
import type { TutorProfile } from "@/lib/tutor-profiles";
import {
  areMockTutorsEnabled,
  hasExplicitMockTutorFlag,
  isProductionNodeEnv,
  type MockTutorEnv,
} from "@/lib/tutors/mock-gate";

const FALLBACK_WARNING =
  "[Aprendiz Bay] Usando MOCK_TUTORS porque ENABLE_MOCK_TUTORS está ativo. Execute `npx tsx scripts/seed.ts` apenas em desenvolvimento.";

const PRODUCTION_FLAG_WARNING =
  "[Aprendiz Bay] ENABLE_MOCK_TUTORS é ignorado em produção. O catálogo público usa apenas o Firestore.";

let fallbackWarningLogged = false;
let productionFlagWarningLogged = false;

export function warnMockTutorFallback() {
  if (fallbackWarningLogged || typeof console === "undefined") {
    return;
  }

  console.warn(FALLBACK_WARNING);
  fallbackWarningLogged = true;
}

function warnProductionIgnoresMockFlag(env: MockTutorEnv) {
  if (
    productionFlagWarningLogged ||
    typeof console === "undefined" ||
    !isProductionNodeEnv(env) ||
    !hasExplicitMockTutorFlag(env)
  ) {
    return;
  }

  console.warn(PRODUCTION_FLAG_WARNING);
  productionFlagWarningLogged = true;
}

/**
 * Dynamic import keeps fictional inventory out of production bundles.
 * `process.env.NODE_ENV === "production"` is replaced at build time, so the
 * import is dead-code-eliminated from `next build`.
 */
async function loadMockTutors(): Promise<Tutor[]> {
  if (process.env.NODE_ENV === "production") {
    return [];
  }

  const { MOCK_TUTORS } = await import("../mock-tutors");
  return MOCK_TUTORS;
}

async function loadMockTutorProfile(id: string): Promise<TutorProfile | undefined> {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  const { getTutorProfile } = await import("../tutor-profiles");
  return getTutorProfile(id);
}

export async function getMockTutorsForFallback(
  env: MockTutorEnv = process.env,
): Promise<Tutor[]> {
  warnProductionIgnoresMockFlag(env);

  if (!areMockTutorsEnabled(env)) {
    return [];
  }

  warnMockTutorFallback();
  return loadMockTutors();
}

export async function getMockTutorProfileForFallback(
  id: string,
  env: MockTutorEnv = process.env,
): Promise<TutorProfile | undefined> {
  warnProductionIgnoresMockFlag(env);

  if (!areMockTutorsEnabled(env)) {
    return undefined;
  }

  warnMockTutorFallback();
  return loadMockTutorProfile(id);
}
