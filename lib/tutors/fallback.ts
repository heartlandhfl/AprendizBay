import { MOCK_TUTORS, type Tutor } from "@/lib/mock-tutors";
import { getTutorProfile as getMockTutorProfile, type TutorProfile } from "@/lib/tutor-profiles";
import { areMockTutorsEnabled, type MockTutorEnv } from "@/lib/tutors/mock-gate";

const FALLBACK_WARNING =
  "[Aprendiz Bay] Usando MOCK_TUTORS porque ENABLE_MOCK_TUTORS está ativo. Execute `npx tsx scripts/seed.ts` apenas em desenvolvimento.";

let fallbackWarningLogged = false;

export function warnMockTutorFallback() {
  if (fallbackWarningLogged || typeof console === "undefined") {
    return;
  }

  console.warn(FALLBACK_WARNING);
  fallbackWarningLogged = true;
}

export function getMockTutorsForFallback(env: MockTutorEnv = process.env): Tutor[] {
  if (!areMockTutorsEnabled(env)) {
    return [];
  }

  warnMockTutorFallback();
  return MOCK_TUTORS;
}

export function getMockTutorProfileForFallback(
  id: string,
  env: MockTutorEnv = process.env,
): TutorProfile | undefined {
  if (!areMockTutorsEnabled(env)) {
    return undefined;
  }

  warnMockTutorFallback();
  return getMockTutorProfile(id);
}
