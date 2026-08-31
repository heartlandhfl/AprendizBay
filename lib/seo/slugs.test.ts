import { describe, expect, it } from "vitest";
import { findLabelBySlug, slugsMatch, toSeoSlug } from "@/lib/seo/slugs";

describe("toSeoSlug", () => {
  it("strips Portuguese accents and punctuation", () => {
    expect(toSeoSlug("Inglês")).toBe("ingles");
    expect(toSeoSlug("São Paulo")).toBe("sao-paulo");
    expect(toSeoSlug("Rio de Janeiro")).toBe("rio-de-janeiro");
    expect(toSeoSlug("Matemática")).toBe("matematica");
    expect(toSeoSlug("Violão")).toBe("violao");
  });

  it("collapses duplicate separators so city pages do not fork", () => {
    expect(toSeoSlug("São  Paulo")).toBe("sao-paulo");
    expect(toSeoSlug("/São Paulo/")).toBe("sao-paulo");
  });
});

describe("slugsMatch / findLabelBySlug", () => {
  it("matches labels to their slug form", () => {
    expect(slugsMatch("São Paulo", "sao-paulo")).toBe(true);
    expect(findLabelBySlug(["Inglês", "Python"], "ingles")).toBe("Inglês");
    expect(findLabelBySlug(["Inglês"], "frances")).toBeUndefined();
  });
});
