import { describe, expect, it } from "vitest";
import {
  buildProfileSummaryFields,
  hasProfileSummaryData,
} from "@/lib/student-dashboard/profile-summary";

describe("profile summary", () => {
  it("builds readable profile fields", () => {
    expect(
      buildProfileSummaryFields({
        preferredSubject: "Matemática",
        preferredLevel: "Ensino Médio",
        preferredModality: "online",
        preferredCity: "São Paulo",
        learningObjective: "Reforço escolar",
      }),
    ).toEqual([
      { label: "Matéria de interesse", value: "Matemática" },
      { label: "Nível", value: "Ensino Médio" },
      { label: "Modalidade", value: "Online" },
      { label: "Cidade", value: "São Paulo" },
      { label: "Objetivo", value: "Reforço escolar" },
    ]);
  });

  it("detects when profile summary is empty", () => {
    expect(hasProfileSummaryData({})).toBe(false);
    expect(hasProfileSummaryData({ preferredSubject: "Inglês" })).toBe(true);
  });
});
