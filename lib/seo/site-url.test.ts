import { afterEach, describe, expect, it } from "vitest";
import { canonicalPath, getSiteOrigin, PRODUCTION_SITE_ORIGIN } from "@/lib/seo/site-url";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getSiteOrigin", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    expect(
      getSiteOrigin({
        ...process.env,
        NEXT_PUBLIC_SITE_URL: "https://www.aprendizbay.com.br/",
      }),
    ).toBe("https://www.aprendizbay.com.br");
  });

  it("does not publish localhost as the production canonical origin", () => {
    expect(
      getSiteOrigin({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: undefined,
        VERCEL_URL: undefined,
      }),
    ).toBe(PRODUCTION_SITE_ORIGIN);
  });

  it("uses localhost only outside production", () => {
    expect(
      getSiteOrigin({
        NODE_ENV: "development",
        NEXT_PUBLIC_SITE_URL: undefined,
        VERCEL_URL: undefined,
      }),
    ).toBe("http://localhost:3000");
  });
});

describe("canonicalPath", () => {
  it("normalizes trailing slashes", () => {
    expect(canonicalPath("/")).toBe("/");
    expect(canonicalPath("/professores/")).toBe("/professores");
    expect(canonicalPath("tutor/1")).toBe("/tutor/1");
  });
});
