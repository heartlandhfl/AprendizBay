export const PRIVATE_ROBOTS = { index: false, follow: false } as const;
export const INDEX_FOLLOW_ROBOTS = { index: true, follow: true } as const;
export const NOINDEX_FOLLOW_ROBOTS = { index: false, follow: true } as const;

/** Paths crawlers must not index. Private account, admin and API surfaces. */
export const ROBOTS_DISALLOW_PATHS = [
  "/admin",
  "/admin/",
  "/api/",
  "/aulas",
  "/aulas/",
  "/bookings",
  "/bookings/",
  "/dashboard",
  "/dashboard/",
  "/configuracoes",
  "/mensagens",
  "/mensagens/",
  "/tutor/dashboard",
  "/tutor/onboarding",
  "/tutor/settings",
] as const;

export function buildRobotsPolicy(origin: string) {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
