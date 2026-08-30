import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/bookings",
        "/mensagens",
        "/tutor/dashboard",
        "/tutor/onboarding",
        "/tutor/settings",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
