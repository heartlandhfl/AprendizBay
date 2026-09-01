import { describe, expect, it } from "vitest";
import { MOCK_TUTORS } from "@/lib/mock-tutors";
import {
  getPopularSubjectCityPairs,
  resolveSubjectCity,
} from "@/lib/seo/subject-city";
import { buildTutorPersonJsonLd } from "@/lib/seo/tutor-jsonld";
import {
  okTutorList,
  resolveFailedHubItem,
  resolveFailedTutorCatalog,
  resolveFailedTutorProfile,
  tutorsForPublicPages,
} from "@/lib/tutors/catalog";
import { areMockTutorsEnabled } from "@/lib/tutors/mock-gate";

const PRODUCTION_ENV = {
  NODE_ENV: "production",
  ENABLE_MOCK_TUTORS: "true",
  NEXT_PUBLIC_ENABLE_MOCK_TUTORS: "true",
};

describe("resolveFailedTutorCatalog", () => {
  it("never returns fictional tutors when NODE_ENV is production", () => {
    const result = resolveFailedTutorCatalog("unavailable", {
      mocksEnabled: areMockTutorsEnabled(PRODUCTION_ENV),
      mockItems: MOCK_TUTORS,
    });

    expect(result.state).toBe("unavailable");
    expect(result.items).toEqual([]);
    expect(result.items.map((tutor) => tutor.name)).not.toContain("Mariana Silva");
    expect(result.items.some((tutor) => tutor.isVerified)).toBe(false);
    expect(result.items.some((tutor) => tutor.rating > 0)).toBe(false);
  });

  it("returns mock tutors only when the development gate is on", () => {
    const result = resolveFailedTutorCatalog("error", {
      mocksEnabled: areMockTutorsEnabled({
        NODE_ENV: "development",
        ENABLE_MOCK_TUTORS: "true",
      }),
      mockItems: MOCK_TUTORS,
    });

    expect(result.state).toBe("ok");
    expect(result.items.map((tutor) => tutor.name)).toContain("Mariana Silva");
  });
});

describe("tutorsForPublicPages", () => {
  it("keeps SEO, sitemap and JSON-LD empty when Firebase failed", () => {
    const catalog = resolveFailedTutorCatalog("unavailable", {
      mocksEnabled: areMockTutorsEnabled(PRODUCTION_ENV),
      mockItems: MOCK_TUTORS,
    });
    const tutors = tutorsForPublicPages(catalog);

    expect(tutors).toEqual([]);
    expect(getPopularSubjectCityPairs(tutors)).toEqual([]);
    expect(resolveSubjectCity(tutors, "ingles", "sao-paulo")).toBeUndefined();
  });

  it("strips known mock identities from SEO pages in production", () => {
    const tutors = tutorsForPublicPages(okTutorList(MOCK_TUTORS), PRODUCTION_ENV);

    expect(tutors).toEqual([]);
    expect(getPopularSubjectCityPairs(tutors)).toEqual([]);
    expect(tutorsForPublicPages(okTutorList(["1", "real-tutor"]), PRODUCTION_ENV)).toEqual([
      "real-tutor",
    ]);
  });

  it("does not emit structured data for a failed catalog", () => {
    const catalog = resolveFailedTutorCatalog("error", {
      mocksEnabled: false,
      mockItems: MOCK_TUTORS,
    });

    expect(tutorsForPublicPages(catalog)).toEqual([]);
    expect(() =>
      tutorsForPublicPages(catalog).map((tutor) => buildTutorPersonJsonLd(tutor)),
    ).not.toThrow();
  });
});

describe("resolveFailedTutorProfile", () => {
  it("does not invent a person when mocks are disabled", () => {
    const result = resolveFailedTutorProfile("unavailable", {
      mocksEnabled: false,
      mockTutor: MOCK_TUTORS[0],
    });

    expect(result.state).toBe("unavailable");
    expect(result.tutor).toBeUndefined();
  });
});

describe("resolveFailedHubItem", () => {
  it("does not return a fake collective class in production", () => {
    const result = resolveFailedHubItem("unavailable", {
      mocksEnabled: areMockTutorsEnabled(PRODUCTION_ENV),
      mockHub: { id: "hub-m1", title: "Inglês para Viagem — Primeiros Passos" },
    });

    expect(result.state).toBe("unavailable");
    expect(result.hub).toBeNull();
  });
});
