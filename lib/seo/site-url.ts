/**
 * Canonical site origin for metadata, sitemap.xml and robots.txt.
 */
export function getSiteUrl(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const value of candidates) {
    const url = tryParseAbsoluteUrl(value);
    if (url) {
      return url;
    }
  }

  return new URL("http://localhost:3000");
}

export function getSiteOrigin(): string {
  return getSiteUrl().origin.replace(/\/$/, "");
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
    return new URL(withProtocol);
  } catch {
    return undefined;
  }
}
