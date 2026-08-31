import { describe, expect, it } from "vitest";
import { MOCK_TUTORS, type Tutor } from "@/lib/mock-tutors";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";
import {
  ALL_CITIES_LABEL,
  ALL_SUBJECTS_LABEL,
  DEFAULT_FILTERS,
  applyTutorSearchFilters,
  countActiveSearchFilters,
  firestoreSearchConstraints,
  isCompleteTutorProfile,
  isEligibleForSearch,
  searchEmptyState,
  tutorExperienceYears,
  type SearchFilterState,
} from "@/lib/tutors/search";

function firestoreTutor(
  overrides: Partial<FirestoreTutorDoc> = {},
): FirestoreTutorDoc {
  return {
    userId: "tutor-1",
    name: "Mariana Silva",
    subject: "Inglês",
    city: "São Paulo",
    state: "SP",
    bio: "Professora certificada com foco em conversação.",
    individualPrice: 70,
    collectivePrice: 25,
    modality: "ambos",
    lessonTypes: ["individual", "coletivo"],
    isVerified: true,
    verificationStatus: "approved",
    isOnline: true,
    rating: 4.9,
    reviewCount: 10,
    ...overrides,
  };
}

function tutor(overrides: Partial<Tutor> = {}): Tutor {
  return {
    ...MOCK_TUTORS[0]!,
    ...overrides,
  };
}

describe("isCompleteTutorProfile", () => {
  it("accepts a fully filled public profile", () => {
    expect(isCompleteTutorProfile(firestoreTutor())).toBe(true);
  });

  it("rejects missing name, subject, city or bio", () => {
    expect(isCompleteTutorProfile(firestoreTutor({ name: "  " }))).toBe(false);
    expect(isCompleteTutorProfile(firestoreTutor({ subject: "" }))).toBe(false);
    expect(isCompleteTutorProfile(firestoreTutor({ city: "" }))).toBe(false);
    expect(isCompleteTutorProfile(firestoreTutor({ bio: "" }))).toBe(false);
  });

  it("rejects a profile without a usable price for the offered lesson types", () => {
    expect(
      isCompleteTutorProfile(
        firestoreTutor({
          lessonTypes: ["individual"],
          individualPrice: 0,
          collectivePrice: 25,
        }),
      ),
    ).toBe(false);
    expect(
      isCompleteTutorProfile(
        firestoreTutor({
          lessonTypes: ["coletivo"],
          individualPrice: 0,
          collectivePrice: 22,
        }),
      ),
    ).toBe(true);
  });
});

describe("isEligibleForSearch", () => {
  it("includes approved complete tutors, including legacy isVerified docs", () => {
    expect(isEligibleForSearch(firestoreTutor())).toBe(true);
    expect(
      isEligibleForSearch(
        firestoreTutor({ isVerified: true, verificationStatus: undefined }),
      ),
    ).toBe(true);
  });

  it("excludes rejected, suspended, pending and incomplete tutors", () => {
    expect(
      isEligibleForSearch(firestoreTutor({ verificationStatus: "rejected", isVerified: false })),
    ).toBe(false);
    expect(
      isEligibleForSearch(
        firestoreTutor({ verificationStatus: "suspended", isVerified: true }),
      ),
    ).toBe(false);
    expect(
      isEligibleForSearch(firestoreTutor({ verificationStatus: "pending", isVerified: false })),
    ).toBe(false);
    expect(
      isEligibleForSearch(
        firestoreTutor({ verificationStatus: "changes_requested", isVerified: false }),
      ),
    ).toBe(false);
    expect(
      isEligibleForSearch(firestoreTutor({ verificationStatus: "approved", bio: "" })),
    ).toBe(false);
  });
});

describe("firestoreSearchConstraints", () => {
  it("only forwards subject and city when they are specific", () => {
    expect(
      firestoreSearchConstraints({
        subject: ALL_SUBJECTS_LABEL,
        city: ALL_CITIES_LABEL,
      }),
    ).toEqual({ subject: undefined, city: undefined });

    expect(
      firestoreSearchConstraints({
        subject: "Inglês",
        city: "São Paulo",
      }),
    ).toEqual({ subject: "Inglês", city: "São Paulo" });
  });
});

describe("applyTutorSearchFilters", () => {
  const catalog = MOCK_TUTORS;

  it("filters by disciplina and cidade", () => {
    expect(
      applyTutorSearchFilters(catalog, { ...DEFAULT_FILTERS, subject: "Inglês" }).map(
        (item) => item.id,
      ),
    ).toEqual(["1"]);

    expect(
      applyTutorSearchFilters(catalog, { ...DEFAULT_FILTERS, city: "Curitiba" }).map(
        (item) => item.id,
      ),
    ).toEqual(["2"]);
  });

  it("matches cidade by SEO slug", () => {
    expect(
      applyTutorSearchFilters(catalog, { ...DEFAULT_FILTERS, city: "sao-paulo" }).map(
        (item) => item.name,
      ),
    ).toEqual(["Mariana Silva"]);
  });

  it("filters online and presencial, keeping tutors who offer both", () => {
    const online = applyTutorSearchFilters(catalog, {
      ...DEFAULT_FILTERS,
      modality: "online",
    });
    expect(online.map((item) => item.name)).toEqual([
      "Lucas Ferreira",
      "Mariana Silva",
      "Fernanda Costa",
      "Rodrigo Almeida",
    ]);

    const presencial = applyTutorSearchFilters(catalog, {
      ...DEFAULT_FILTERS,
      modality: "presencial",
    });
    expect(presencial.map((item) => item.name)).toEqual([
      "Mariana Silva",
      "Rodrigo Almeida",
      "André Martins",
    ]);
  });

  it("distinguishes aula individual and aula coletiva", () => {
    const individualOnly = [
      tutor({ id: "solo", name: "Ana Solo", lessonTypes: ["individual"], collectivePrice: 0 }),
      tutor({ id: "group", name: "Bia Grupo", lessonTypes: ["coletivo"], individualPrice: 0 }),
    ];

    expect(
      applyTutorSearchFilters(individualOnly, {
        ...DEFAULT_FILTERS,
        lessonType: "individual",
      }).map((item) => item.id),
    ).toEqual(["solo"]);

    expect(
      applyTutorSearchFilters(individualOnly, {
        ...DEFAULT_FILTERS,
        lessonType: "coletivo",
      }).map((item) => item.id),
    ).toEqual(["group"]);
  });

  it("filters by faixa de preço using the selected lesson type", () => {
    const cheapCollective = applyTutorSearchFilters(catalog, {
      ...DEFAULT_FILTERS,
      lessonType: "coletivo",
      priceRangeIndex: 1,
    });
    expect(cheapCollective.every((item) => item.collectivePrice <= 30)).toBe(true);

    const midIndividual = applyTutorSearchFilters(catalog, {
      ...DEFAULT_FILTERS,
      lessonType: "individual",
      priceRangeIndex: 2,
    });
    expect(
      midIndividual.every(
        (item) => item.individualPrice >= 30 && item.individualPrice <= 60,
      ),
    ).toBe(true);
  });

  it("filters by avaliação mínima", () => {
    const topRated = applyTutorSearchFilters(catalog, {
      ...DEFAULT_FILTERS,
      minRating: 4.9,
    });
    expect(topRated.every((item) => item.rating >= 4.9)).toBe(true);
    expect(topRated.map((item) => item.name)).toEqual([
      "Lucas Ferreira",
      "Mariana Silva",
      "Fernanda Costa",
    ]);
  });

  it("can require a verified professor and still keep approved tutors", () => {
    const mixed = [
      tutor({ id: "ok", isVerified: true }),
      tutor({ id: "no", isVerified: false, name: "Pendente" }),
    ];

    expect(
      applyTutorSearchFilters(mixed, { ...DEFAULT_FILTERS, verifiedOnly: true }).map(
        (item) => item.id,
      ),
    ).toEqual(["ok"]);
  });

  it("filters by nível de ensino and experiência when those fields exist", () => {
    const withLevels = [
      tutor({
        id: "enem",
        educationLevels: ["Pré-vestibular / ENEM"],
        yearsOfExperience: 8,
      }),
      tutor({
        id: "idioma",
        name: "Carla",
        rating: 4.2,
        educationLevels: ["Idiomas"],
        yearsOfExperience: 1,
      }),
    ];

    expect(
      applyTutorSearchFilters(withLevels, {
        ...DEFAULT_FILTERS,
        educationLevel: "Pré-vestibular / ENEM",
      }).map((item) => item.id),
    ).toEqual(["enem"]);

    expect(
      applyTutorSearchFilters(withLevels, {
        ...DEFAULT_FILTERS,
        minYearsOfExperience: 5,
      }).map((item) => item.id),
    ).toEqual(["enem"]);
  });

  it("uses hours taught as experiência when yearsOfExperience is missing", () => {
    expect(tutorExperienceYears({ hoursTaught: 240 })).toBe(2);
    expect(
      applyTutorSearchFilters(
        [tutor({ id: "hours", yearsOfExperience: undefined, hoursTaught: 600 })],
        { ...DEFAULT_FILTERS, minYearsOfExperience: 5 },
      ).map((item) => item.id),
    ).toEqual(["hours"]);
  });

  it("filters by disponibilidade when hasAvailability is present", () => {
    const mixed = [
      tutor({ id: "open", hasAvailability: true }),
      tutor({ id: "closed", name: "Sem agenda", rating: 5, hasAvailability: false }),
    ];

    expect(
      applyTutorSearchFilters(mixed, { ...DEFAULT_FILTERS, availableOnly: true }).map(
        (item) => item.id,
      ),
    ).toEqual(["open"]);
  });

  it("does not match nível de ensino or experiência when the tutor has no such data", () => {
    const bare = tutor({
      educationLevels: undefined,
      yearsOfExperience: undefined,
      hoursTaught: undefined,
    });

    expect(
      applyTutorSearchFilters([bare], {
        ...DEFAULT_FILTERS,
        educationLevel: "Idiomas",
      }),
    ).toEqual([]);
    expect(
      applyTutorSearchFilters([bare], {
        ...DEFAULT_FILTERS,
        minYearsOfExperience: 2,
      }),
    ).toEqual([]);
  });
});

describe("search empty copy and active filter count", () => {
  it("counts only filters that differ from the defaults", () => {
    expect(countActiveSearchFilters(DEFAULT_FILTERS)).toBe(0);
    expect(
      countActiveSearchFilters({
        ...DEFAULT_FILTERS,
        subject: "Inglês",
        city: "São Paulo",
        modality: "online",
      }),
    ).toBe(3);
  });

  it("describes subject and city empty states in Portuguese", () => {
    const copy = searchEmptyState({
      ...DEFAULT_FILTERS,
      subject: "Inglês",
      city: "Recife",
    } satisfies SearchFilterState);

    expect(copy.title).toBe("Ainda não há professores de Inglês em Recife");
    expect(copy.description).toMatch(/online/i);
  });

  it("describes empty aula coletiva results separately from aula individual", () => {
    expect(searchEmptyState({ ...DEFAULT_FILTERS, lessonType: "coletivo" }).title).toBe(
      "Nenhuma aula coletiva encontrada",
    );
    expect(searchEmptyState({ ...DEFAULT_FILTERS, lessonType: "individual" }).title).toBe(
      "Nenhum professor encontrado para aula individual",
    );
  });
});
