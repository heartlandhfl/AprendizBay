import { MOCK_TUTORS } from "@/lib/mock-tutors";
import { getTutorProfile as getMockTutorProfile } from "@/lib/tutor-profiles";

const FALLBACK_WARNING =
  "[Aprendiz Bay] Coleção tutors vazia — usando MOCK_TUTORS temporariamente. Execute `npx tsx scripts/seed.ts` para popular o Firestore.";

let fallbackWarningLogged = false;

/**
 * Demo tutors must never be indexed. Production builds omit the mock
 * fallback unless SEO_ALLOW_MOCK_TUTORS=1 (local SEO previews only).
 */
export function allowMockTutorFallback(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.SEO_ALLOW_MOCK_TUTORS === "0") {
    return false;
  }
  if (env.SEO_ALLOW_MOCK_TUTORS === "1") {
    return true;
  }
  return env.NODE_ENV !== "production";
}

export function warnMockTutorFallback() {
  if (fallbackWarningLogged || typeof console === "undefined") {
    return;
  }

  console.warn(FALLBACK_WARNING);
  fallbackWarningLogged = true;
}

export function getMockTutorsForFallback() {
  warnMockTutorFallback();
  return MOCK_TUTORS;
}

export function getMockTutorProfileForFallback(id: string) {
  warnMockTutorFallback();
  return getMockTutorProfile(id);
}
