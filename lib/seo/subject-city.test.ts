import { describe, expect, it } from "vitest";
import { MOCK_TUTORS, type Tutor } from "@/lib/mock-tutors";
import {
  cityPreposition,
  filterTutorsForSubjectCity,
  getIndexableSubjectCityPairs,
  hasLocalSubjectCityInventory,
  relatedSubjectCityLinks,
  resolveSubjectCity,
  subjectCityEmptyCopy,
  subjectCityHeading,
  subjectCityPath,
  subjectCitySeoCopy,
} from "@/lib/seo/subject-city";

function tutor(overrides: Partial<Tutor>): Tutor {
  return { ...MOCK_TUTORS[0]!, ...overrides };
}

describe("getIndexableSubjectCityPairs", () => {
  it("includes only subject×city pairs that have a local tutor", () => {
    const pairs = getIndexableSubjectCityPairs(MOCK_TUTORS);
    const keys = pairs.map((pair) => `${pair.materia}/${pair.cidade}`);

    expect(keys).toEqual([
      "espanhol/porto-alegre",
      "ingles/sao-paulo",
      "matematica/belo-horizonte",
      "python/curitiba",
      "violao/rio-de-janeiro",
    ]);
    expect(keys).not.toContain("ingles/curitiba");
    expect(keys).not.toContain("python/sao-paulo");
  });

  it("does not invent a cartesian product of popular subjects and cities", () => {
    const pairs = getIndexableSubjectCityPairs(MOCK_TUTORS);
    expect(pairs).toHaveLength(MOCK_TUTORS.length);
  });

  it("dedupes the same city written with different accents", () => {
    const pairs = getIndexableSubjectCityPairs([
      tutor({ id: "a", subject: "Inglês", city: "São Paulo" }),
      tutor({ id: "b", subject: "Inglês", city: "Sao Paulo" }),
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ materia: "ingles", cidade: "sao-paulo" });
  });

  it("caps the number of landing pages", () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      tutor({
        id: `t-${index}`,
        subject: `Matéria ${index}`,
        city: `Cidade ${index}`,
      }),
    );

    expect(getIndexableSubjectCityPairs(many, 3)).toHaveLength(3);
  });
});

describe("resolveSubjectCity and inventory", () => {
  it("resolves known Portuguese labels", () => {
    expect(resolveSubjectCity(MOCK_TUTORS, "ingles", "sao-paulo")).toEqual({
      subject: "Inglês",
      city: "São Paulo",
      state: "SP",
    });
  });

  it("does not resolve a subject or city that no tutor uses", () => {
    expect(resolveSubjectCity(MOCK_TUTORS, "frances", "recife")).toBeUndefined();
  });

  it("can resolve a known subject and city that have no local pair", () => {
    const resolved = resolveSubjectCity(MOCK_TUTORS, "ingles", "curitiba");
    expect(resolved).toMatchObject({ subject: "Inglês", city: "Curitiba" });
    expect(hasLocalSubjectCityInventory(MOCK_TUTORS, "Inglês", "Curitiba")).toBe(false);
  });

  it("splits local tutors from online teachers of the same subject", () => {
    const localMatch = filterTutorsForSubjectCity(MOCK_TUTORS, "Inglês", "São Paulo");
    expect(localMatch.local).toHaveLength(1);
    expect(localMatch.local[0]?.name).toBe("Mariana Silva");

    const remoteCity = filterTutorsForSubjectCity(MOCK_TUTORS, "Inglês", "Curitiba");
    expect(remoteCity.local).toHaveLength(0);
    expect(remoteCity.online).toHaveLength(1);
    expect(remoteCity.online[0]?.name).toBe("Mariana Silva");
  });
});

describe("Brazilian Portuguese SEO copy", () => {
  it("uses em / no correctly in headings and paths", () => {
    expect(cityPreposition("São Paulo")).toBe("em");
    expect(cityPreposition("Rio de Janeiro")).toBe("no");
    expect(subjectCityHeading("Inglês", "São Paulo")).toBe(
      "Professores de Inglês em São Paulo",
    );
    expect(subjectCityHeading("Violão", "Rio de Janeiro")).toBe(
      "Professores de Violão no Rio de Janeiro",
    );
    expect(subjectCityPath("Inglês", "São Paulo")).toBe("/professores/ingles/sao-paulo");
  });

  it("does not claim local tutors when the city has none", () => {
    const empty = subjectCityEmptyCopy("Inglês", "Curitiba");
    expect(empty.title).toContain("Ainda não temos professores de inglês em Curitiba");
    expect(empty.description).toMatch(/online|outras cidades/i);

    const seo = subjectCitySeoCopy("Inglês", "Curitiba", false);
    expect(seo.indexable).toBe(false);
    expect(seo.title).toContain("em breve");
    expect(seo.description).toContain("Ainda não há professores");
  });

  it("uses indexable copy when local inventory exists", () => {
    const seo = subjectCitySeoCopy("Inglês", "São Paulo", true);
    expect(seo.indexable).toBe(true);
    expect(seo.title).toBe("Professores de Inglês em São Paulo | Aprendiz Bay");
    expect(seo.description).toContain("Encontre professores de inglês em São Paulo");
  });
});

describe("relatedSubjectCityLinks", () => {
  it("only links to other cities that actually have that subject", () => {
    const related = relatedSubjectCityLinks(
      MOCK_TUTORS,
      { subject: "Inglês", city: "São Paulo" },
      { materia: "ingles", cidade: "sao-paulo" },
    );

    expect(related.cities).toEqual([]);
    expect(related.subjects).toEqual([]);
  });

  it("lists another real pair in the same city", () => {
    const extra = tutor({
      id: "9",
      name: "Ana",
      subject: "História",
      city: "São Paulo",
      state: "SP",
    });
    const related = relatedSubjectCityLinks(
      [...MOCK_TUTORS, extra],
      { subject: "Inglês", city: "São Paulo" },
      { materia: "ingles", cidade: "sao-paulo" },
    );

    expect(related.subjects.map((pair) => pair.subject)).toEqual(["História"]);
  });
});
