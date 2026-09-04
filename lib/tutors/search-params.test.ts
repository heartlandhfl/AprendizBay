import { describe, expect, it } from "vitest";
import {
  broadenSearchFilters,
  buildSearchHref,
  hasActiveSearchCriteria,
  hasExplicitSearchParams,
  mergeProfileDefaults,
  parseSearchFiltersFromParams,
  sanitizeSearchReturnPath,
  serializeSearchFilters,
} from "@/lib/tutors/search-params";
import { DEFAULT_FILTERS } from "@/lib/tutors/search";

describe("parseSearchFiltersFromParams", () => {
  it("maps subject, city, modality and level from the URL", () => {
    expect(
      parseSearchFiltersFromParams({
        subject: "Matemática",
        city: "São Paulo",
        modality: "online",
        level: "Ensino médio",
        price: "2",
        available: "1",
      }),
    ).toEqual({
      ...DEFAULT_FILTERS,
      subject: "Matemática",
      city: "São Paulo",
      modality: "online",
      educationLevel: "Ensino médio",
      priceRangeIndex: 2,
      availableOnly: true,
    });
  });

  it("maps legacy q param to an exact catalog subject", () => {
    expect(parseSearchFiltersFromParams({ q: "Inglês" }).subject).toBe("Inglês");
  });
});

describe("serializeSearchFilters", () => {
  it("round-trips active filters through the URL", () => {
    const filters = {
      ...DEFAULT_FILTERS,
      subject: "Inglês",
      city: "Campinas",
      modality: "presencial" as const,
      educationLevel: "Graduação",
      availableOnly: true,
    };

    const params = serializeSearchFilters(filters);
    expect(parseSearchFiltersFromParams(params)).toEqual(filters);
    expect(buildSearchHref(filters)).toBe(
      "/search?subject=Ingl%C3%AAs&city=Campinas&modality=presencial&level=Gradua%C3%A7%C3%A3o&available=1",
    );
  });
});

describe("mergeProfileDefaults", () => {
  it("prefills search filters from the student profile", () => {
    expect(
      mergeProfileDefaults(DEFAULT_FILTERS, {
        preferredSubject: "Matemática",
        preferredLevel: "Ensino médio",
        preferredModality: "presencial",
        preferredCity: "São Paulo",
      }),
    ).toEqual({
      ...DEFAULT_FILTERS,
      subject: "Matemática",
      educationLevel: "Ensino médio",
      modality: "presencial",
      city: "São Paulo",
    });
  });

  it("does not override explicit filters already chosen by the user", () => {
    const explicit = {
      ...DEFAULT_FILTERS,
      subject: "Física",
      city: "Curitiba",
      modality: "online" as const,
    };

    expect(
      mergeProfileDefaults(explicit, {
        preferredSubject: "Matemática",
        preferredCity: "São Paulo",
        preferredModality: "presencial",
      }),
    ).toEqual(explicit);
  });
});

describe("hasExplicitSearchParams", () => {
  it("detects when the URL already encodes search intent", () => {
    expect(hasExplicitSearchParams({})).toBe(false);
    expect(hasExplicitSearchParams({ subject: "Inglês" })).toBe(true);
    expect(hasExplicitSearchParams({ level: "Graduação" })).toBe(true);
  });
});

describe("hasActiveSearchCriteria", () => {
  it("treats the default landing state as having no active criteria", () => {
    expect(hasActiveSearchCriteria(DEFAULT_FILTERS)).toBe(false);
    expect(
      hasActiveSearchCriteria({
        ...DEFAULT_FILTERS,
        subject: "Inglês",
      }),
    ).toBe(true);
    expect(
      hasActiveSearchCriteria({
        ...DEFAULT_FILTERS,
        verifiedOnly: false,
      }),
    ).toBe(true);
  });
});

describe("broadenSearchFilters", () => {
  it("relaxes the most restrictive filter first", () => {
    expect(
      broadenSearchFilters({
        ...DEFAULT_FILTERS,
        subject: "Inglês",
        availableOnly: true,
      }).availableOnly,
    ).toBe(false);
  });
});

describe("sanitizeSearchReturnPath", () => {
  it("allows only search result URLs", () => {
    expect(sanitizeSearchReturnPath("/search?subject=Ingl%C3%AAs")).toBe(
      "/search?subject=Ingl%C3%AAs",
    );
    expect(sanitizeSearchReturnPath("https://evil.test/search")).toBeNull();
    expect(sanitizeSearchReturnPath("/dashboard")).toBeNull();
  });
});
