import type { FilterModality } from "@/lib/mock-tutors";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";
import { SUBJECTS } from "@/lib/tutors/catalog-options";
import { SEARCH_CITIES } from "@/lib/tutors/constants";
import {
  ALL_CITIES_LABEL,
  ALL_SUBJECTS_LABEL,
  DEFAULT_FILTERS,
  isSpecificCity,
  isSpecificSubject,
  type SearchFilterState,
} from "@/lib/tutors/search";

export type SearchPageParams = Record<string, string | string[] | undefined>;

function readParam(
  params: SearchPageParams | URLSearchParams,
  key: string,
): string | undefined {
  if (params instanceof URLSearchParams) {
    const value = params.get(key);
    return value?.trim() ? value : undefined;
  }

  const raw = params[key];
  if (Array.isArray(raw)) {
    const value = raw[0]?.trim();
    return value || undefined;
  }

  const value = raw?.trim();
  return value || undefined;
}

function subjectFromQuery(query: string): string {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_FILTERS.subject;
  }

  const match = SUBJECTS.find(
    (subject) => subject !== ALL_SUBJECTS_LABEL && subject.toLowerCase() === normalized,
  );
  return match ?? DEFAULT_FILTERS.subject;
}

function modalityFromParam(value?: string): FilterModality {
  if (value === "online" || value === "presencial") {
    return value;
  }
  return DEFAULT_FILTERS.modality;
}

function cityFromParam(value?: string): string {
  if (!value) {
    return DEFAULT_FILTERS.city;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === ALL_CITIES_LABEL.toLowerCase()) {
    return DEFAULT_FILTERS.city;
  }

  const match = SEARCH_CITIES.find((city) => city.toLowerCase() === normalized);
  return match ?? value.trim();
}

function parseBooleanParam(value?: string, fallback = false): boolean {
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }
  return fallback;
}

function parseNumberParam(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function hasExplicitSearchParams(params: SearchPageParams): boolean {
  const keys = [
    "q",
    "subject",
    "city",
    "modality",
    "level",
    "price",
    "available",
    "lessonType",
    "minRating",
    "verified",
    "experience",
  ];

  return keys.some((key) => Boolean(readParam(params, key)));
}

export function parseSearchFiltersFromParams(
  params: SearchPageParams | URLSearchParams,
): SearchFilterState {
  const subjectParam = readParam(params, "subject");
  const queryParam = readParam(params, "q");
  const subject = subjectParam
    ? subjectFromQuery(subjectParam)
    : queryParam
      ? subjectFromQuery(queryParam)
      : DEFAULT_FILTERS.subject;

  const level = readParam(params, "level");

  return {
    ...DEFAULT_FILTERS,
    subject,
    city: cityFromParam(readParam(params, "city")),
    modality: modalityFromParam(readParam(params, "modality")),
    educationLevel: level ?? DEFAULT_FILTERS.educationLevel,
    priceRangeIndex: parseNumberParam(readParam(params, "price"), DEFAULT_FILTERS.priceRangeIndex),
    availableOnly: parseBooleanParam(readParam(params, "available"), DEFAULT_FILTERS.availableOnly),
    lessonType:
      readParam(params, "lessonType") === "individual" ||
      readParam(params, "lessonType") === "coletivo"
        ? (readParam(params, "lessonType") as SearchFilterState["lessonType"])
        : DEFAULT_FILTERS.lessonType,
    minRating: parseNumberParam(readParam(params, "minRating"), DEFAULT_FILTERS.minRating),
    verifiedOnly: parseBooleanParam(readParam(params, "verified"), DEFAULT_FILTERS.verifiedOnly),
    minYearsOfExperience: parseNumberParam(
      readParam(params, "experience"),
      DEFAULT_FILTERS.minYearsOfExperience,
    ),
  };
}

export function serializeSearchFilters(filters: SearchFilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.subject !== DEFAULT_FILTERS.subject) {
    params.set("subject", filters.subject);
  }

  if (filters.city !== DEFAULT_FILTERS.city) {
    params.set("city", filters.city);
  }

  if (filters.modality !== DEFAULT_FILTERS.modality) {
    params.set("modality", filters.modality);
  }

  if (filters.educationLevel !== DEFAULT_FILTERS.educationLevel) {
    params.set("level", filters.educationLevel);
  }

  if (filters.priceRangeIndex !== DEFAULT_FILTERS.priceRangeIndex) {
    params.set("price", String(filters.priceRangeIndex));
  }

  if (filters.availableOnly !== DEFAULT_FILTERS.availableOnly) {
    params.set("available", filters.availableOnly ? "1" : "0");
  }

  if (filters.lessonType !== DEFAULT_FILTERS.lessonType) {
    params.set("lessonType", filters.lessonType);
  }

  if (filters.minRating !== DEFAULT_FILTERS.minRating) {
    params.set("minRating", String(filters.minRating));
  }

  if (filters.verifiedOnly !== DEFAULT_FILTERS.verifiedOnly) {
    params.set("verified", filters.verifiedOnly ? "1" : "0");
  }

  if (filters.minYearsOfExperience !== DEFAULT_FILTERS.minYearsOfExperience) {
    params.set("experience", String(filters.minYearsOfExperience));
  }

  return params;
}

export function buildSearchHref(filters: SearchFilterState): string {
  const query = serializeSearchFilters(filters).toString();
  return query ? `/search?${query}` : "/search";
}

export function mergeProfileDefaults(
  filters: SearchFilterState,
  profile: StudentLearningProfile | null | undefined,
): SearchFilterState {
  if (!profile) {
    return filters;
  }

  const next = { ...filters };

  if (next.subject === DEFAULT_FILTERS.subject && profile.preferredSubject?.trim()) {
    next.subject = subjectFromQuery(profile.preferredSubject);
  }

  if (
    next.educationLevel === DEFAULT_FILTERS.educationLevel &&
    profile.preferredLevel?.trim()
  ) {
    next.educationLevel = profile.preferredLevel.trim();
  }

  if (next.modality === DEFAULT_FILTERS.modality) {
    if (profile.preferredModality === "online" || profile.preferredModality === "presencial") {
      next.modality = profile.preferredModality;
    }
  }

  if (next.city === DEFAULT_FILTERS.city) {
    const city = profile.preferredCity?.trim() || profile.city?.trim();
    if (city && next.modality !== "online") {
      next.city = cityFromParam(city);
    }
  }

  return next;
}

export function hasActiveSearchCriteria(filters: SearchFilterState): boolean {
  if (isSpecificSubject(filters.subject)) {
    return true;
  }

  if (isSpecificCity(filters.city)) {
    return true;
  }

  if (filters.modality !== DEFAULT_FILTERS.modality) {
    return true;
  }

  if (filters.educationLevel !== DEFAULT_FILTERS.educationLevel) {
    return true;
  }

  if (filters.priceRangeIndex !== DEFAULT_FILTERS.priceRangeIndex) {
    return true;
  }

  if (filters.lessonType !== DEFAULT_FILTERS.lessonType) {
    return true;
  }

  if (filters.minRating !== DEFAULT_FILTERS.minRating) {
    return true;
  }

  if (filters.minYearsOfExperience !== DEFAULT_FILTERS.minYearsOfExperience) {
    return true;
  }

  if (filters.availableOnly) {
    return true;
  }

  if (filters.verifiedOnly !== DEFAULT_FILTERS.verifiedOnly) {
    return true;
  }

  return false;
}

export function broadenSearchFilters(filters: SearchFilterState): SearchFilterState {
  const next = { ...filters };

  if (next.availableOnly) {
    next.availableOnly = false;
    return next;
  }

  if (next.minYearsOfExperience > 0) {
    next.minYearsOfExperience = 0;
    return next;
  }

  if (next.minRating > 0) {
    next.minRating = 0;
    return next;
  }

  if (next.priceRangeIndex !== DEFAULT_FILTERS.priceRangeIndex) {
    next.priceRangeIndex = DEFAULT_FILTERS.priceRangeIndex;
    return next;
  }

  if (next.educationLevel !== DEFAULT_FILTERS.educationLevel) {
    next.educationLevel = DEFAULT_FILTERS.educationLevel;
    return next;
  }

  if (next.lessonType !== DEFAULT_FILTERS.lessonType) {
    next.lessonType = DEFAULT_FILTERS.lessonType;
    return next;
  }

  if (next.modality === "presencial") {
    next.modality = "online";
    return next;
  }

  if (next.modality !== DEFAULT_FILTERS.modality) {
    next.modality = DEFAULT_FILTERS.modality;
    return next;
  }

  if (next.city !== DEFAULT_FILTERS.city) {
    next.city = DEFAULT_FILTERS.city;
    return next;
  }

  if (next.subject !== DEFAULT_FILTERS.subject) {
    next.subject = DEFAULT_FILTERS.subject;
    return next;
  }

  return DEFAULT_FILTERS;
}

const ALLOWED_RETURN_PREFIXES = ["/search"];

export function sanitizeSearchReturnPath(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  if (!ALLOWED_RETURN_PREFIXES.some((prefix) => trimmed === prefix || trimmed.startsWith(`${prefix}?`))) {
    return null;
  }

  return trimmed;
}
