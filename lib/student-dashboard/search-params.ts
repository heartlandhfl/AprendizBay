import type { StudentLearningProfile } from "@/lib/student-dashboard/types";

/**
 * Builds a `/search` URL using the student's learning profile preferences.
 * Uses the existing marketplace search page — no second search engine.
 */
export function buildSearchUrlFromProfile(
  profile: StudentLearningProfile | null | undefined,
  query?: string,
): string {
  const params = new URLSearchParams();
  const subject = query?.trim() || profile?.preferredSubject?.trim();

  if (subject) {
    params.set("subject", subject);
  }

  if (profile?.preferredModality === "online" || profile?.preferredModality === "presencial") {
    params.set("modality", profile.preferredModality);
  }

  const city = profile?.preferredCity?.trim() || profile?.city?.trim();
  if (city && profile?.preferredModality !== "online") {
    params.set("city", city);
  }

  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : "/search";
}
