import type { Tutor } from "@/lib/mock-tutors";
import { findLabelBySlug, slugsMatch, toSeoSlug } from "@/lib/seo/slugs";

/** Soft cap so a large catalog cannot emit thousands of thin landing pages. */
export const MAX_INDEXABLE_SUBJECT_CITY_PAIRS = 200;

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

export interface SubjectCityInventory {
  local: Tutor[];
  online: Tutor[];
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

function pairKey(subject: string, city: string): string | undefined {
  const materia = toSeoSlug(subject);
  const cidade = toSeoSlug(city);
  if (!materia || !cidade) {
    return undefined;
  }
  return `${materia}/${cidade}`;
}

/**
 * Subject×city pairs that have at least one local tutor. Never invents
 * combinations (no cartesian product) and dedupes by slug.
 */
export function getIndexableSubjectCityPairs(
  tutors: Tutor[],
  maxPairs = MAX_INDEXABLE_SUBJECT_CITY_PAIRS,
): SubjectCityPair[] {
  const groups = new Map<string, { pair: SubjectCityPair; count: number }>();

  for (const tutor of tutors) {
    const subject = tutor.subject.trim();
    const city = tutor.city.trim();
    const key = pairKey(subject, city);
    if (!key) {
      continue;
    }

    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    const [materia, cidade] = key.split("/");
    groups.set(key, {
      pair: { materia: materia!, cidade: cidade!, subject, city },
      count: 1,
    });
  }

  return [...groups.values()]
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      const subjectCompare = a.pair.subject.localeCompare(b.pair.subject, "pt-BR");
      if (subjectCompare !== 0) {
        return subjectCompare;
      }
      return a.pair.city.localeCompare(b.pair.city, "pt-BR");
    })
    .slice(0, maxPairs)
    .map(({ pair }) => pair)
    .sort((a, b) => {
      const subjectCompare = a.subject.localeCompare(b.subject, "pt-BR");
      if (subjectCompare !== 0) {
        return subjectCompare;
      }
      return a.city.localeCompare(b.city, "pt-BR");
    });
}

/** @deprecated Use getIndexableSubjectCityPairs. Kept as the public alias. */
export function getPopularSubjectCityPairs(
  tutors: Tutor[],
  maxPairs = MAX_INDEXABLE_SUBJECT_CITY_PAIRS,
): SubjectCityPair[] {
  return getIndexableSubjectCityPairs(tutors, maxPairs);
}

export function hasLocalSubjectCityInventory(
  tutors: Tutor[],
  subject: string,
  city: string,
): boolean {
  return tutors.some(
    (tutor) => slugsMatch(tutor.subject, subject) && slugsMatch(tutor.city, city),
  );
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
): SubjectCityInventory {
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

export function relatedSubjectCityLinks(
  tutors: Tutor[],
  resolved: ResolvedSubjectCity,
  current: { materia: string; cidade: string },
  limit = 6,
): { cities: SubjectCityPair[]; subjects: SubjectCityPair[] } {
  const pairs = getIndexableSubjectCityPairs(tutors);

  return {
    cities: pairs
      .filter(
        (pair) => pair.subject === resolved.subject && pair.cidade !== current.cidade,
      )
      .slice(0, limit),
    subjects: pairs
      .filter((pair) => pair.city === resolved.city && pair.materia !== current.materia)
      .slice(0, limit),
  };
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

export function subjectCityEmptyCopy(subject: string, city: string): {
  title: string;
  description: string;
} {
  const prep = cityPreposition(city);
  return {
    title: `Ainda não temos professores de ${subject.toLowerCase()} ${prep} ${city}`,
    description:
      "Nenhum professor verificado oferece essa matéria nesta cidade ainda. Veja quem ensina online ou explore outras cidades — sem inventar disponibilidade local.",
  };
}

export function subjectCitySeoCopy(
  subject: string,
  city: string,
  hasLocalInventory: boolean,
): { title: string; description: string; indexable: boolean } {
  const heading = subjectCityHeading(subject, city);
  const prep = cityPreposition(city);
  const subjectLabel = subject.toLowerCase();

  if (hasLocalInventory) {
    return {
      title: `${heading} | Aprendiz Bay`,
      description: `Encontre professores de ${subjectLabel} ${prep} ${city} para aulas particulares ou em grupo. Compare preços e economize com aulas coletivas.`,
      indexable: true,
    };
  }

  return {
    title: `Professores de ${subject} ${prep} ${city} — em breve | Aprendiz Bay`,
    description: `Ainda não há professores de ${subjectLabel} ${prep} ${city} na Aprendiz Bay. Veja aulas online dessa matéria ou explore outras cidades.`,
    indexable: false,
  };
}
