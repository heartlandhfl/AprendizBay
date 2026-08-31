import { describe, expect, it } from "vitest";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";
import { mapFirestoreTutorDoc, mapFirestoreTutorProfile } from "@/lib/tutors/map";

function baseDoc(overrides: Partial<FirestoreTutorDoc> = {}): FirestoreTutorDoc {
  return {
    userId: "tutor-1",
    name: "Ana Souza",
    subject: "Inglês",
    city: "Recife",
    state: "PE",
    bio: "Professora de inglês com foco em conversação.",
    individualPrice: 80,
    collectivePrice: 30,
    modality: "online",
    isVerified: false,
    isOnline: false,
    rating: 0,
    reviewCount: 0,
    ...overrides,
  };
}

describe("mapFirestoreTutorDoc", () => {
  it("does not invent an avatar, lesson types, or a photo", () => {
    const tutor = mapFirestoreTutorDoc(
      "tutor-1",
      baseDoc({
        individualPrice: 0,
        collectivePrice: 0,
        lessonTypes: [],
      }),
    );

    expect(tutor.avatarUrl).toBe("");
    expect(tutor.lessonTypes).toEqual([]);
    expect(tutor.rating).toBe(0);
    expect(tutor.reviewCount).toBe(0);
  });

  it("keeps stored lesson types instead of assuming both formats", () => {
    const tutor = mapFirestoreTutorDoc(
      "tutor-1",
      baseDoc({ lessonTypes: ["individual"] }),
    );

    expect(tutor.lessonTypes).toEqual(["individual"]);
  });

  it("maps public search fields and omits private verification data", () => {
    const data = {
      userId: "tutor-1",
      name: "Mariana Silva",
      subject: "Inglês",
      city: "São Paulo",
      state: "SP",
      bio: "Professora de inglês.",
      individualPrice: 70,
      collectivePrice: 25,
      modality: "ambos",
      isVerified: true,
      verificationStatus: "approved",
      isOnline: true,
      rating: 4.9,
      reviewCount: 10,
      credentialFileName: "rg.pdf",
      reviewedBy: "admin-1",
      verificationReason: "Documento ok",
      educationLevels: ["Idiomas"],
      yearsOfExperience: 8,
      hasAvailability: true,
      hoursTaught: 1240,
    } as FirestoreTutorDoc;

    const tutor = mapFirestoreTutorDoc("tutor-1", data);

    expect(tutor).toMatchObject({
      id: "tutor-1",
      name: "Mariana Silva",
      subject: "Inglês",
      city: "São Paulo",
      isVerified: true,
      educationLevels: ["Idiomas"],
      yearsOfExperience: 8,
      hasAvailability: true,
      hoursTaught: 1240,
    });
    expect(tutor).not.toHaveProperty("credentialFileName");
    expect(tutor).not.toHaveProperty("reviewedBy");
    expect(tutor).not.toHaveProperty("reviewedAt");
    expect(tutor).not.toHaveProperty("verificationReason");
    expect(tutor).not.toHaveProperty("userId");
  });
});

describe("mapFirestoreTutorProfile", () => {
  it("only marks the tutor as verified when marketplace visibility is approved", () => {
    const pending = mapFirestoreTutorProfile(
      "tutor-1",
      baseDoc({ isVerified: true, verificationStatus: "pending" }),
      [],
    );
    const approved = mapFirestoreTutorProfile(
      "tutor-1",
      baseDoc({ isVerified: true, verificationStatus: "approved" }),
      [],
    );

    expect(pending.isVerified).toBe(false);
    expect(approved.isVerified).toBe(true);
  });

  it("omits empty optional profile fields instead of filling them in", () => {
    const profile = mapFirestoreTutorProfile("tutor-1", baseDoc(), []);

    expect(profile.headline).toBeUndefined();
    expect(profile.methodology).toBeUndefined();
    expect(profile.experience).toBeUndefined();
    expect(profile.qualifications).toBeUndefined();
    expect(profile.levels).toBeUndefined();
    expect(profile.languages).toBeUndefined();
    expect(profile.specialties).toBeUndefined();
    expect(profile.responseTime).toBeUndefined();
    expect(profile.firstLessonPrice).toBeUndefined();
    expect(profile.offersFreeTrial).toBeUndefined();
    expect(profile.hoursTaught).toBeUndefined();
    expect(profile.studentsServed).toBeUndefined();
    expect(profile.about).toBe("Professora de inglês com foco em conversação.");
  });

  it("maps optional teaching and trial fields only when they exist", () => {
    const profile = mapFirestoreTutorProfile(
      "tutor-1",
      baseDoc({
        headline: "Conversação para viagens",
        about: "Apresentação longa",
        methodology: "Aulas práticas",
        experience: "8 anos em escolas de idioma",
        qualifications: ["CELTA", "Licenciatura"],
        subjects: ["Inglês", "Conversação"],
        levels: ["Intermediário"],
        languages: ["Português", "Inglês"],
        specialties: ["Entrevistas"],
        responseTime: "2 horas",
        firstLessonPrice: 20,
        offersFreeTrial: true,
        hoursTaught: 120,
        studentsServed: 40,
        rating: 4.8,
        reviewCount: 12,
      }),
      [],
    );

    expect(profile.headline).toBe("Conversação para viagens");
    expect(profile.about).toBe("Apresentação longa");
    expect(profile.methodology).toBe("Aulas práticas");
    expect(profile.experience).toBe("8 anos em escolas de idioma");
    expect(profile.qualifications).toEqual(["CELTA", "Licenciatura"]);
    expect(profile.subjects).toEqual(["Inglês", "Conversação"]);
    expect(profile.levels).toEqual(["Intermediário"]);
    expect(profile.languages).toEqual(["Português", "Inglês"]);
    expect(profile.specialties).toEqual(["Entrevistas"]);
    expect(profile.responseTime).toBe("2 horas");
    expect(profile.firstLessonPrice).toBe(20);
    expect(profile.offersFreeTrial).toBe(true);
    expect(profile.hoursTaught).toBe(120);
    expect(profile.studentsServed).toBe(40);
    expect(profile.rating).toBe(4.8);
    expect(profile.reviewCount).toBe(12);
  });

  it("uses stored education levels as teaching levels when levels are absent", () => {
    const profile = mapFirestoreTutorProfile(
      "tutor-1",
      baseDoc({ educationLevels: ["Idiomas"] }),
      [],
    );

    expect(profile.levels).toEqual(["Idiomas"]);
  });
});
