import {
  PRICE_RANGES,
  type FilterLessonType,
  type FilterModality,
  type Tutor,
} from "@/lib/mock-tutors";
import { slugsMatch } from "@/lib/seo/slugs";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";
import { isMarketplaceVisible } from "@/lib/tutors/verification";

export const SEARCH_RESULT_LIMIT = 60;

export const ALL_SUBJECTS_LABEL = "Todas as matérias";
export const ALL_CITIES_LABEL = "Todas as cidades";
export const ALL_EDUCATION_LEVELS_LABEL = "Todos os níveis";

export const EDUCATION_LEVELS = [
  "Ensino fundamental",
  "Ensino médio",
  "Pré-vestibular / ENEM",
  "Graduação",
  "Idiomas",
  "Profissionalizante",
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const MIN_RATING_OPTIONS = [
  { value: 0, label: "Qualquer avaliação" },
  { value: 3, label: "A partir de 3,0" },
  { value: 4, label: "A partir de 4,0" },
  { value: 4.5, label: "A partir de 4,5" },
] as const;

export const EXPERIENCE_OPTIONS = [
  { minYears: 0, label: "Qualquer experiência" },
  { minYears: 2, label: "Pelo menos 2 anos" },
  { minYears: 5, label: "Pelo menos 5 anos" },
  { minYears: 10, label: "Pelo menos 10 anos" },
] as const;

/** Hours of teaching counted as one year when yearsOfExperience is absent. */
const HOURS_PER_EXPERIENCE_YEAR = 120;

export interface SearchFilterState {
  subject: string;
  city: string;
  priceRangeIndex: number;
  modality: FilterModality;
  lessonType: FilterLessonType;
  minRating: number;
  verifiedOnly: boolean;
  educationLevel: string;
  minYearsOfExperience: number;
  availableOnly: boolean;
}

export const DEFAULT_FILTERS: SearchFilterState = {
  subject: ALL_SUBJECTS_LABEL,
  city: ALL_CITIES_LABEL,
  priceRangeIndex: 0,
  modality: "todos",
  lessonType: "todos",
  minRating: 0,
  verifiedOnly: true,
  educationLevel: ALL_EDUCATION_LEVELS_LABEL,
  minYearsOfExperience: 0,
  availableOnly: false,
};

export interface FirestoreTutorSearchConstraints {
  subject?: string;
  city?: string;
}

export interface SearchEmptyCopy {
  title: string;
  description: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositivePrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isSpecificSubject(subject?: string): boolean {
  return Boolean(subject && subject !== ALL_SUBJECTS_LABEL);
}

export function isSpecificCity(city?: string): boolean {
  return Boolean(city && city !== ALL_CITIES_LABEL);
}

export function isCompleteTutorProfile(
  data?: Partial<FirestoreTutorDoc> | null,
): boolean {
  if (!data) {
    return false;
  }

  const offersIndividual = !data.lessonTypes || data.lessonTypes.includes("individual");
  const offersCollective = !data.lessonTypes || data.lessonTypes.includes("coletivo");

  const hasOfferedPrice =
    (offersIndividual && isPositivePrice(data.individualPrice)) ||
    (offersCollective && isPositivePrice(data.collectivePrice));

  return (
    isNonEmptyString(data.name) &&
    isNonEmptyString(data.subject) &&
    isNonEmptyString(data.city) &&
    isNonEmptyString(data.bio) &&
    hasOfferedPrice
  );
}

export function isEligibleForSearch(
  data?: Partial<FirestoreTutorDoc> | null,
): boolean {
  return isMarketplaceVisible(data) && isCompleteTutorProfile(data);
}

export function firestoreSearchConstraints(
  filters: Pick<SearchFilterState, "subject" | "city"> | { subject?: string; city?: string },
): FirestoreTutorSearchConstraints {
  return {
    subject: isSpecificSubject(filters.subject) ? filters.subject : undefined,
    city: isSpecificCity(filters.city) ? filters.city : undefined,
  };
}

export function tutorExperienceYears(tutor: Pick<Tutor, "yearsOfExperience" | "hoursTaught">): number | null {
  if (typeof tutor.yearsOfExperience === "number" && Number.isFinite(tutor.yearsOfExperience)) {
    return tutor.yearsOfExperience;
  }

  if (typeof tutor.hoursTaught === "number" && tutor.hoursTaught > 0) {
    return tutor.hoursTaught / HOURS_PER_EXPERIENCE_YEAR;
  }

  return null;
}

function cityMatches(tutorCity: string, selectedCity: string): boolean {
  return (
    slugsMatch(tutorCity, selectedCity) ||
    tutorCity.trim().toLowerCase() === selectedCity.trim().toLowerCase()
  );
}

function priceInRange(price: number, range: (typeof PRICE_RANGES)[number]): boolean {
  return price >= range.min && price <= range.max;
}

function tutorMatchesPrice(tutor: Tutor, filters: SearchFilterState): boolean {
  const range = PRICE_RANGES[filters.priceRangeIndex] ?? PRICE_RANGES[0];
  const offersIndividual = tutor.lessonTypes.includes("individual");
  const offersCollective = tutor.lessonTypes.includes("coletivo");

  if (filters.lessonType === "individual") {
    return offersIndividual && priceInRange(tutor.individualPrice, range);
  }

  if (filters.lessonType === "coletivo") {
    return offersCollective && priceInRange(tutor.collectivePrice, range);
  }

  return (
    (offersIndividual && priceInRange(tutor.individualPrice, range)) ||
    (offersCollective && priceInRange(tutor.collectivePrice, range))
  );
}

export function applyTutorSearchFilters(
  tutors: Tutor[],
  filters: SearchFilterState,
): Tutor[] {
  return tutors
    .filter((tutor) => {
      if (isSpecificSubject(filters.subject) && tutor.subject !== filters.subject) {
        return false;
      }

      if (isSpecificCity(filters.city) && !cityMatches(tutor.city, filters.city)) {
        return false;
      }

      if (!tutorMatchesPrice(tutor, filters)) {
        return false;
      }

      if (
        filters.modality !== "todos" &&
        tutor.modality !== filters.modality &&
        tutor.modality !== "ambos"
      ) {
        return false;
      }

      if (filters.lessonType !== "todos" && !tutor.lessonTypes.includes(filters.lessonType)) {
        return false;
      }

      if (filters.minRating > 0 && tutor.rating < filters.minRating) {
        return false;
      }

      if (filters.verifiedOnly && tutor.isVerified === false) {
        return false;
      }

      if (
        filters.educationLevel &&
        filters.educationLevel !== ALL_EDUCATION_LEVELS_LABEL &&
        !tutor.educationLevels?.includes(filters.educationLevel)
      ) {
        return false;
      }

      if (filters.minYearsOfExperience > 0) {
        const years = tutorExperienceYears(tutor);
        if (years === null || years < filters.minYearsOfExperience) {
          return false;
        }
      }

      if (filters.availableOnly && tutor.hasAvailability !== true) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.rating - a.rating);
}

export function countActiveSearchFilters(filters: SearchFilterState): number {
  let count = 0;

  if (isSpecificSubject(filters.subject)) count += 1;
  if (isSpecificCity(filters.city)) count += 1;
  if (filters.priceRangeIndex !== DEFAULT_FILTERS.priceRangeIndex) count += 1;
  if (filters.modality !== DEFAULT_FILTERS.modality) count += 1;
  if (filters.lessonType !== DEFAULT_FILTERS.lessonType) count += 1;
  if (filters.minRating !== DEFAULT_FILTERS.minRating) count += 1;
  if (filters.verifiedOnly !== DEFAULT_FILTERS.verifiedOnly) count += 1;
  if (filters.educationLevel !== DEFAULT_FILTERS.educationLevel) count += 1;
  if (filters.minYearsOfExperience !== DEFAULT_FILTERS.minYearsOfExperience) count += 1;
  if (filters.availableOnly !== DEFAULT_FILTERS.availableOnly) count += 1;

  return count;
}

export function searchEmptyState(filters: SearchFilterState): SearchEmptyCopy {
  const subject = isSpecificSubject(filters.subject) ? filters.subject : null;
  const city = isSpecificCity(filters.city) ? filters.city : null;

  if (filters.lessonType === "coletivo") {
    if (subject && city) {
      return {
        title: `Nenhuma aula coletiva de ${subject} em ${city}`,
        description:
          "Tente outra cidade, aulas online ou limpe os filtros para ver turmas disponíveis.",
      };
    }

    return {
      title: "Nenhuma aula coletiva encontrada",
      description:
        "Ajuste a disciplina, a cidade ou a faixa de preço para ver turmas com vagas.",
    };
  }

  if (filters.lessonType === "individual") {
    if (subject && city) {
      return {
        title: `Nenhum professor de ${subject} em ${city} para aula individual`,
        description:
          "Experimente aulas online, outra cidade ou limpe os filtros para ver mais professores.",
      };
    }

    return {
      title: "Nenhum professor encontrado para aula individual",
      description: "Tente ajustar os filtros para ver mais resultados.",
    };
  }

  if (subject && city) {
    return {
      title: `Ainda não há professores de ${subject} em ${city}`,
      description:
        "Veja quem ensina essa disciplina online, explore outra cidade ou limpe os filtros.",
    };
  }

  if (subject) {
    return {
      title: `Nenhum professor de ${subject} com esses filtros`,
      description: "Tente outra cidade, modalidade ou limpe os filtros para ver mais resultados.",
    };
  }

  if (city) {
    return {
      title: `Nenhum professor encontrado em ${city}`,
      description:
        "Experimente aulas online, outra disciplina ou limpe os filtros para ver mais resultados.",
    };
  }

  return {
    title: "Nenhum professor ou turma encontrada",
    description: "Tente ajustar os filtros para ver mais resultados.",
  };
}
