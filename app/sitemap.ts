import type { MetadataRoute } from "next";
import { getPopularSubjectCityPairs, subjectCityPath } from "@/lib/seo/subject-city";
import { getSiteOrigin } from "@/lib/seo/site-url";
import { tutorsForPublicPages } from "@/lib/tutors/catalog";
import { fetchAllTutorIds, fetchVerifiedTutorsServer } from "@/lib/tutors/server";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
  const lastModified = new Date();

  const [tutorCatalog, tutorIdCatalog] = await Promise.all([
    fetchVerifiedTutorsServer(),
    fetchAllTutorIds(),
  ]);
  const tutors = tutorsForPublicPages(tutorCatalog);
  const tutorIds = tutorsForPublicPages(tutorIdCatalog);

  const subjectCityPages = getPopularSubjectCityPairs(tutors).map((pair) => ({
    url: `${origin}${subjectCityPath(pair.subject, pair.city)}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const tutorProfiles = tutorIds.map((id) => ({
    url: `${origin}/tutor/${id}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: origin,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${origin}/professores`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${origin}/search`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...subjectCityPages,
    ...tutorProfiles,
  ];
}
