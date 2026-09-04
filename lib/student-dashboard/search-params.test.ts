import { describe, expect, it } from "vitest";
import { buildSearchUrlFromProfile } from "@/lib/student-dashboard/search-params";

describe("buildSearchUrlFromProfile", () => {
  it("returns plain search when profile is empty", () => {
    expect(buildSearchUrlFromProfile({})).toBe("/search");
  });

  it("maps learning profile fields to search params", () => {
    expect(
      buildSearchUrlFromProfile({
        preferredSubject: "Matemática",
        preferredModality: "presencial",
        preferredCity: "São Paulo",
      }),
    ).toBe("/search?subject=Matem%C3%A1tica&modality=presencial&city=S%C3%A3o+Paulo");
  });

  it("prefers explicit query over profile subject", () => {
    expect(buildSearchUrlFromProfile({ preferredSubject: "Inglês" }, "Física")).toBe(
      "/search?subject=F%C3%ADsica",
    );
  });

  it("falls back to account city when preferred city is absent", () => {
    expect(
      buildSearchUrlFromProfile({
        city: "Campinas",
        preferredModality: "ambos",
      }),
    ).toBe("/search?city=Campinas");
  });
});
