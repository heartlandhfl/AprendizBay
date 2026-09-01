import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MOCK_TUTORS } from "@/lib/mock-tutors";
import {
  resolveFailedTutorCatalog,
  tutorsForPublicPages,
} from "@/lib/tutors/catalog";
import { getMockTutorsForFallback } from "@/lib/tutors/fallback";
import { areMockTutorsEnabled } from "@/lib/tutors/mock-gate";
import { getPopularSubjectCityPairs } from "@/lib/seo/subject-city";

const USER_FACING_PAGES = [
  "app/page.tsx",
  "app/search/page.tsx",
  "app/tutor/[id]/page.tsx",
  "app/professores/page.tsx",
  "app/professores/[materia]/[cidade]/page.tsx",
  "app/sitemap.ts",
  "components/search/SearchResults.tsx",
  "components/search/SearchFilters.tsx",
  "components/hubs/CollectiveClassDetail.tsx",
  "components/hubs/CreateHubForm.tsx",
];

const MOCK_IDENTITIES = [
  "Mariana Silva",
  "Lucas Ferreira",
  "Rodrigo Almeida",
  "Fernanda Costa",
  "André Martins",
];

describe("production mock tutor guard", () => {
  it("proves MOCK_TUTORS cannot appear when NODE_ENV=production", async () => {
    const env = {
      NODE_ENV: "production",
      ENABLE_MOCK_TUTORS: "true",
      NEXT_PUBLIC_ENABLE_MOCK_TUTORS: "true",
    };

    const fallback = await getMockTutorsForFallback(env);
    const catalog = resolveFailedTutorCatalog("unavailable", {
      mocksEnabled: areMockTutorsEnabled(env),
      mockItems: MOCK_TUTORS,
    });
    const seoTutors = tutorsForPublicPages(catalog);

    expect(areMockTutorsEnabled(env)).toBe(false);
    expect(fallback).toEqual([]);
    expect(catalog.items).toEqual([]);
    expect(seoTutors).toEqual([]);
    expect(getPopularSubjectCityPairs(seoTutors)).toEqual([]);

    for (const name of MOCK_IDENTITIES) {
      expect(fallback.some((tutor) => tutor.name === name)).toBe(false);
      expect(catalog.items.some((tutor) => tutor.name === name)).toBe(false);
      expect(JSON.stringify(catalog)).not.toContain(name);
    }
  });

  it("does not import MOCK_TUTORS into user-facing pages", () => {
    for (const relativePath of USER_FACING_PAGES) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      expect(source, relativePath).not.toMatch(/MOCK_TUTORS/);
      expect(source, relativePath).not.toMatch(/TUTOR_PROFILE_DETAILS/);
      expect(source, relativePath).not.toMatch(/from ["']@\/lib\/tutor-profiles["']/);
    }
  });

  it("keeps production filter constants free of fictional tutor records", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/tutors/catalog-options.ts"), "utf8");
    expect(source).not.toMatch(/Mariana Silva|rating: 4\.9|reviewCount/);
  });

  it("gates every Firebase fallback through the mock flag", () => {
    const loaders = [
      "lib/tutors/server.ts",
      "lib/tutors/client.ts",
      "lib/tutors/fallback.ts",
      "lib/hubs/service.ts",
      "scripts/seed.ts",
    ];

    for (const relativePath of loaders) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      expect(source, relativePath).toMatch(/areMockTutorsEnabled|assertDevSeedAllowed/);
    }
  });
});
