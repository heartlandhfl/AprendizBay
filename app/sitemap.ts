import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/seo/sitemap-entries";
import { getSiteOrigin } from "@/lib/seo/site-url";
import { tutorsForPublicPages } from "@/lib/tutors/catalog";
import { fetchAllTutorIds, fetchVerifiedTutorsServer } from "@/lib/tutors/server";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tutorCatalog, tutorIdCatalog] = await Promise.all([
    fetchVerifiedTutorsServer(),
    fetchAllTutorIds(),
  ]);

  return buildSitemapEntries({
    origin: getSiteOrigin(),
    tutors: tutorsForPublicPages(tutorCatalog),
    tutorIds: tutorsForPublicPages(tutorIdCatalog),
  });
}
