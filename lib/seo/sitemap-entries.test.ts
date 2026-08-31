import { describe, expect, it } from "vitest";
import { MOCK_TUTORS } from "@/lib/mock-tutors";
import { buildSitemapEntries } from "@/lib/seo/sitemap-entries";

const origin = "https://www.aprendizbay.com.br";
const lastModified = new Date("2026-08-31T12:00:00.000Z");

describe("buildSitemapEntries", () => {
  it("includes only legitimate static pages, real pairs and real tutor ids", () => {
    const entries = buildSitemapEntries({
      origin,
      tutors: MOCK_TUTORS,
      tutorIds: MOCK_TUTORS.map((tutor) => tutor.id),
      lastModified,
    });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(origin);
    expect(urls).toContain(`${origin}/professores`);
    expect(urls).toContain(`${origin}/search`);
    expect(urls).toContain(`${origin}/termos`);
    expect(urls).toContain(`${origin}/privacidade`);
    expect(urls).toContain(`${origin}/professores/ingles/sao-paulo`);
    expect(urls).toContain(`${origin}/tutor/1`);

    expect(urls).not.toContain(`${origin}/professores/ingles/curitiba`);
    expect(urls).not.toContain(`${origin}/admin`);
    expect(urls).not.toContain(`${origin}/bookings`);
    expect(urls).not.toContain(`${origin}/tutor/dashboard`);
  });

  it("omits tutor and subject×city URLs when there is no inventory", () => {
    const entries = buildSitemapEntries({
      origin,
      tutors: [],
      tutorIds: [],
      lastModified,
    });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      origin,
      `${origin}/professores`,
      `${origin}/search`,
      `${origin}/termos`,
      `${origin}/privacidade`,
    ]);
    expect(urls.every((url) => !url.includes("/tutor/"))).toBe(true);
  });

  it("dedupes tutor ids", () => {
    const entries = buildSitemapEntries({
      origin,
      tutors: [],
      tutorIds: ["abc", "abc", ""],
      lastModified,
    });

    expect(entries.filter((entry) => entry.url.includes("/tutor/"))).toHaveLength(1);
  });
});
