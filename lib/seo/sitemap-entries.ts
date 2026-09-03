import type { Tutor } from "@/lib/mock-tutors";
import { getIndexableSubjectCityPairs, subjectCityPath } from "@/lib/seo/subject-city";

export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
}

export interface StaticSitemapPath {
  path: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
}

/** Always-indexable marketing and legal URLs. No inventory required. */
export const STATIC_SITEMAP_PATHS: readonly StaticSitemapPath[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/professores", changeFrequency: "weekly", priority: 0.9 },
  { path: "/seja-professor", changeFrequency: "monthly", priority: 0.8 },
  { path: "/aulas-coletivas", changeFrequency: "monthly", priority: 0.8 },
  { path: "/como-funciona", changeFrequency: "monthly", priority: 0.7 },
  { path: "/search", changeFrequency: "weekly", priority: 0.6 },
  { path: "/ajuda", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contato", changeFrequency: "yearly", priority: 0.4 },
  { path: "/termos", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacidade", changeFrequency: "yearly", priority: 0.3 },
];

export function absoluteUrl(origin: string, path: string): string {
  if (path === "/") {
    return origin;
  }
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Builds sitemap rows from real tutors only. Callers must pass
 * tutorsForPublicPages() results, never MOCK_TUTORS in production.
 */
export function buildSitemapEntries(input: {
  origin: string;
  tutors: Tutor[];
  tutorIds: string[];
  lastModified?: Date;
}): SitemapEntry[] {
  const lastModified = input.lastModified ?? new Date();

  const staticPages = STATIC_SITEMAP_PATHS.map((entry) => ({
    url: absoluteUrl(input.origin, entry.path),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  const subjectCityPages = getIndexableSubjectCityPairs(input.tutors).map((pair) => ({
    url: absoluteUrl(input.origin, subjectCityPath(pair.subject, pair.city)),
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const seenTutorIds = new Set<string>();
  const tutorProfiles: SitemapEntry[] = [];
  for (const id of input.tutorIds) {
    const trimmed = id.trim();
    if (!trimmed || seenTutorIds.has(trimmed)) {
      continue;
    }
    seenTutorIds.add(trimmed);
    tutorProfiles.push({
      url: absoluteUrl(input.origin, `/tutor/${trimmed}`),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return [...staticPages, ...subjectCityPages, ...tutorProfiles];
}
