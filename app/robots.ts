import type { MetadataRoute } from "next";
import { buildRobotsPolicy } from "@/lib/seo/robots-policy";
import { getSiteOrigin } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  return buildRobotsPolicy(getSiteOrigin());
}
