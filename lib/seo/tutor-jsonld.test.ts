import { describe, expect, it } from "vitest";
import { MOCK_TUTORS } from "@/lib/mock-tutors";
import {
  buildSubjectCityJsonLd,
  buildTutorPersonJsonLd,
  buildWebsiteJsonLd,
  hasGenuineAggregateRating,
  serializeJsonLd,
} from "@/lib/seo/tutor-jsonld";

const origin = "https://www.aprendizbay.com.br";
const mariana = MOCK_TUTORS[0]!;

describe("hasGenuineAggregateRating", () => {
  it("requires a positive integer review count and a 1–5 rating", () => {
    expect(hasGenuineAggregateRating({ rating: 4.9, reviewCount: 84 })).toBe(true);
    expect(hasGenuineAggregateRating({ rating: 4.9, reviewCount: 0 })).toBe(false);
    expect(hasGenuineAggregateRating({ rating: 0, reviewCount: 3 })).toBe(false);
    expect(hasGenuineAggregateRating({ rating: 6, reviewCount: 3 })).toBe(false);
    expect(hasGenuineAggregateRating({ rating: Number.NaN, reviewCount: 3 })).toBe(false);
    expect(hasGenuineAggregateRating({ rating: 4.5, reviewCount: 1.5 })).toBe(false);
  });
});

describe("buildTutorPersonJsonLd", () => {
  it("emits Person structured data for a real tutor", () => {
    const person = buildTutorPersonJsonLd(mariana, origin);

    expect(person).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Mariana Silva",
      jobTitle: "Professor de Inglês",
      knowsAbout: "Inglês",
      url: `${origin}/tutor/1`,
    });
    expect(person?.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.9,
      reviewCount: 84,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it("omits rating markup when there are no genuine reviews", () => {
    expect(buildTutorPersonJsonLd({ ...mariana, reviewCount: 0 }, origin)?.aggregateRating)
      .toBeUndefined();
    expect(buildTutorPersonJsonLd({ ...mariana, rating: 0, reviewCount: 2 }, origin)?.aggregateRating)
      .toBeUndefined();
  });

  it("does not invent Review objects", () => {
    const person = buildTutorPersonJsonLd(mariana, origin);
    expect(person).not.toHaveProperty("review");
    expect(JSON.stringify(person)).not.toContain('"@type":"Review"');
  });

  it("returns null instead of structured data for an incomplete tutor", () => {
    expect(buildTutorPersonJsonLd({ ...mariana, id: "" }, origin)).toBeNull();
    expect(buildTutorPersonJsonLd({ ...mariana, name: "  " }, origin)).toBeNull();
    expect(buildTutorPersonJsonLd({ ...mariana, subject: "" }, origin)).toBeNull();
  });
});

describe("buildSubjectCityJsonLd", () => {
  it("lists only the local tutors that were passed in", () => {
    const data = buildSubjectCityJsonLd({
      subject: "Inglês",
      city: "São Paulo",
      localTutors: [mariana],
      origin,
    });
    const graph = data["@graph"] as Array<Record<string, unknown>>;
    const itemList = graph.find((node) => node["@type"] === "ItemList");

    expect(itemList).toMatchObject({
      numberOfItems: 1,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          url: `${origin}/tutor/1`,
          name: "Mariana Silva",
        },
      ],
    });
  });

  it("omits ItemList when the city has no local tutors", () => {
    const data = buildSubjectCityJsonLd({
      subject: "Inglês",
      city: "Curitiba",
      localTutors: [],
      origin,
    });
    const graph = data["@graph"] as Array<Record<string, unknown>>;

    expect(graph.some((node) => node["@type"] === "ItemList")).toBe(false);
    expect(graph.some((node) => node["@type"] === "BreadcrumbList")).toBe(true);
  });
});

describe("serializeJsonLd", () => {
  it("escapes HTML so JSON-LD cannot break out of the script tag", () => {
    const serialized = serializeJsonLd({ html: "<script>alert(1)</script>" });
    expect(serialized).not.toContain("<script>");
    expect(serialized).toContain("\\u003cscript>");
  });
});

describe("buildWebsiteJsonLd", () => {
  it("describes the site in Brazilian Portuguese", () => {
    const site = buildWebsiteJsonLd(origin);
    expect(site.inLanguage).toBe("pt-BR");
    expect(site.name).toBe("Aprendiz Bay");
    expect(site.url).toBe(origin);
  });
});
