import type { Tutor } from "@/lib/mock-tutors";
import { findLabelBySlug, slugsMatch, toSeoSlug } from "@/lib/seo/slugs";

export const MAX_COMMON_SUBJECTS = 12;
export const MAX_COMMON_CITIES = 20;

export interface SubjectCityPair {
  materia: string;
  cidade: string;
  subject: string;
  city: string;
}

export interface ResolvedSubjectCity {
  subject: string;
  city: string;
  state?: string;
}

export function countByLabel(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }

  return counts;
}

export function topLabels(counts: Map<string, number>, limit: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0], "pt-BR");
    })
    .slice(0, limit)
    .map(([label]) => label);
}

/**
 * Combines the most frequent subjects and cities from tutor data
 * (cartesian product) and always keeps pairs that actually exist.
 */
export function getPopularSubjectCityPairs(
  tutors: Tutor[],
  maxSubjects = MAX_COMMON_SUBJECTS,
  maxCities = MAX_COMMON_CITIES,
): SubjectCityPair[] {
  const subjectCounts = countByLabel(tutors.map((tutor) => tutor.subject));
  const cityCounts = countByLabel(tutors.map((tutor) => tutor.city));
  const topSubjects = topLabels(subjectCounts, maxSubjects);
  const topCities = topLabels(cityCounts, maxCities);

  const pairs = new Map<string, SubjectCityPair>();

  function addPair(subject: string, city: string) {
    const materia = toSeoSlug(subject);
    const cidade = toSeoSlug(city);
    if (!materia || !cidade) {
      return;
    }

    pairs.set(`${materia}/${cidade}`, {
      materia,
      cidade,
      subject,
      city,
    });
  }

  for (const subject of topSubjects) {
    for (const city of topCities) {
      addPair(subject, city);
    }
  }

  for (const tutor of tutors) {
    addPair(tutor.subject, tutor.city);
  }

  return [...pairs.values()].sort((a, b) => {
    const subjectCompare = a.subject.localeCompare(b.subject, "pt-BR");
    if (subjectCompare !== 0) {
      return subjectCompare;
    }
    return a.city.localeCompare(b.city, "pt-BR");
  });
}

export function resolveSubjectCity(
  tutors: Tutor[],
  materia: string,
  cidade: string,
): ResolvedSubjectCity | undefined {
  const subject = findLabelBySlug(
    tutors.map((tutor) => tutor.subject),
    materia,
  );
  const cityMatch = tutors.find((tutor) => slugsMatch(tutor.city, cidade));

  if (!subject || !cityMatch) {
    return undefined;
  }

  return {
    subject,
    city: cityMatch.city,
    state: cityMatch.state,
  };
}

export function filterTutorsForSubjectCity(
  tutors: Tutor[],
  subject: string,
  city: string,
): { local: Tutor[]; online: Tutor[] } {
  const bySubject = tutors.filter((tutor) => slugsMatch(tutor.subject, subject));
  const local = bySubject.filter((tutor) => slugsMatch(tutor.city, city));
  const localIds = new Set(local.map((tutor) => tutor.id));
  const online = bySubject.filter(
    (tutor) =>
      !localIds.has(tutor.id) &&
      (tutor.modality === "online" || tutor.modality === "ambos"),
  );

  return { local, online };
}

/** Brazilian Portuguese: "no Rio de Janeiro", "em São Paulo". */
export function cityPreposition(city: string): "em" | "no" {
  return toSeoSlug(city) === "rio-de-janeiro" ? "no" : "em";
}

export function subjectCityHeading(subject: string, city: string): string {
  return `Professores de ${subject} ${cityPreposition(city)} ${city}`;
}

export function subjectCityPath(subject: string, city: string): string {
  return `/professores/${toSeoSlug(subject)}/${toSeoSlug(city)}`;
}
