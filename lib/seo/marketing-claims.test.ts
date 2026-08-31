import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findUnsupportedVolumeClaims,
} from "@/lib/seo/marketing-claims";

const PUBLIC_COPY_FILES = [
  "app/page.tsx",
  "app/layout.tsx",
  "app/search/page.tsx",
  "app/professores/page.tsx",
  "app/professores/[materia]/[cidade]/page.tsx",
  "app/turmas/page.tsx",
  "app/turmas/[id]/page.tsx",
  "app/tutor/[id]/page.tsx",
  "components/home/HeroSearch.tsx",
  "components/home/ValueProposition.tsx",
  "components/home/CategoryGrid.tsx",
  "components/home/HowItWorks.tsx",
  "components/layout/Footer.tsx",
  "components/search/SearchResults.tsx",
  "components/search/TutorCard.tsx",
  "components/tutor/TutorHeader.tsx",
  "components/tutor/TutorAbout.tsx",
  "components/tutor/TutorCollectiveClasses.tsx",
  "components/hubs/CollectiveClassCard.tsx",
  "components/hubs/CollectiveClassDetail.tsx",
  "lib/seo/tutor-jsonld.ts",
  "lib/tutor-profiles.ts",
];

describe("public marketing claims", () => {
  it("rejects invented volume language", () => {
    expect(
      findUnsupportedVolumeClaims(
        "Milhares de professores disponíveis para aulas por videoconferência",
      ),
    ).toEqual([
      {
        id: "thousands-of-people-or-lessons",
        match: "Milhares de professores",
      },
    ]);
    expect(
      findUnsupportedVolumeClaims("Encontre professores para aprender do seu jeito"),
    ).toEqual([]);
  });

  it("keeps homepage, search, tutor, collective and SEO copy free of invented counts", () => {
    const root = path.resolve(import.meta.dirname, "../..");

    for (const relativePath of PUBLIC_COPY_FILES) {
      const source = readFileSync(path.join(root, relativePath), "utf8");
      expect(
        findUnsupportedVolumeClaims(source),
        `${relativePath} contains an unsupported volume claim`,
      ).toEqual([]);
    }
  });
});
