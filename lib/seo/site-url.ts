/**
 * Canonical site origin for metadata, sitemap.xml and robots.txt.
 */
export const PRODUCTION_SITE_ORIGIN = "https://www.aprendizbay.com.br";

export function getSiteUrl(
  env: NodeJS.ProcessEnv = process.env,
): URL {
  const candidates = [
    env.NEXT_PUBLIC_SITE_URL,
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
  ];

  for (const value of candidates) {
    const url = tryParseAbsoluteUrl(value);
    if (url) {
      return url;
    }
  }

  if (env.NODE_ENV === "production") {
    return new URL(PRODUCTION_SITE_ORIGIN);
  }

  return new URL("http://localhost:3000");
}

export function getSiteOrigin(env: NodeJS.ProcessEnv = process.env): string {
  return getSiteUrl(env).origin.replace(/\/$/, "");
}

export function canonicalPath(path: string): string {
  if (!path || path === "/") {
    return "/";
  }
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

function tryParseAbsoluteUrl(value: string | undefined): URL | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return url;
    }
    return url;
  } catch {
    return undefined;
  }
}
