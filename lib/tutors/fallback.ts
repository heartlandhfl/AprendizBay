import { MOCK_TUTORS } from "@/lib/mock-tutors";
import { getTutorProfile as getMockTutorProfile } from "@/lib/tutor-profiles";

const FALLBACK_WARNING =
  "[Aprendiz Bay] Coleção tutors vazia — usando MOCK_TUTORS temporariamente. Execute `npx tsx scripts/seed.ts` para popular o Firestore.";

let fallbackWarningLogged = false;

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
