import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/seo/sitemap-entries";
import { getSiteOrigin } from "@/lib/seo/site-url";
import {
  fetchIndexableTutorIdsForSeo,
  fetchIndexableTutorsForSeo,
} from "@/lib/tutors/server";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tutors, tutorIds] = await Promise.all([
    fetchIndexableTutorsForSeo(),
    fetchIndexableTutorIdsForSeo(),
  ]);

  return buildSitemapEntries({
    origin: getSiteOrigin(),
    tutors,
    tutorIds,
  });
}
