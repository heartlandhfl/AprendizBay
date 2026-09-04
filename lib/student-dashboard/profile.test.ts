import { describe, expect, it } from "vitest";
import {
  isStudentLearningProfileComplete,
  shouldPromptProfileCompletion,
} from "@/lib/student-dashboard/profile";
import {
  hasRecommendationData,
  recommendProfessors,
} from "@/lib/student-dashboard/recommendations";
import type { Tutor } from "@/lib/mock-tutors";

function tutor(overrides: Partial<Tutor>): Tutor {
  return {
    id: "tutor-1",
    name: "Ana",
    subject: "Matemática",
    city: "São Paulo",
    state: "SP",
    rating: 4.8,
    reviewCount: 10,
    bio: "Bio",
    individualPrice: 80,
    collectivePrice: 30,
    modality: "online",
    lessonTypes: ["individual", "coletivo"],
    isOnline: true,
    avatarUrl: "",
    avatarColor: "bg-emerald-100",
    isVerified: true,
    hasAvailability: true,
    educationLevels: ["Ensino médio"],
    ...overrides,
  };
}

describe("student dashboard profile", () => {
  it("detects incomplete learning profiles", () => {
    expect(isStudentLearningProfileComplete({})).toBe(false);
    expect(
      isStudentLearningProfileComplete({
        preferredSubject: "Inglês",
        preferredModality: "online",
      }),
    ).toBe(true);
    expect(
      isStudentLearningProfileComplete({
        preferredSubject: "Inglês",
        preferredModality: "presencial",
      }),
    ).toBe(false);
  });

  it("prompts profile completion only for new students", () => {
    expect(shouldPromptProfileCompletion({}, 0)).toBe(true);
    expect(
      shouldPromptProfileCompletion(
        { preferredSubject: "Inglês", preferredModality: "online" },
        0,
      ),
    ).toBe(false);
    expect(shouldPromptProfileCompletion({}, 2)).toBe(false);
  });
});

describe("student dashboard recommendations", () => {
  it("requires profile or booking history before recommending", () => {
    expect(hasRecommendationData({})).toBe(false);
    expect(
      hasRecommendationData({
        profile: { preferredSubject: "Matemática", preferredModality: "online" },
      }),
    ).toBe(true);
    expect(hasRecommendationData({ subjectsFromBookings: ["Inglês"] })).toBe(true);
  });

  it("matches professors deterministically by subject, modality and city", () => {
    const tutors = [
      tutor({ id: "best", subject: "Matemática", city: "São Paulo", modality: "online" }),
      tutor({ id: "other", subject: "Física", city: "Curitiba", modality: "presencial" }),
    ];

    const recommended = recommendProfessors(tutors, {
      profile: {
        preferredSubject: "Matemática",
        preferredModality: "online",
        preferredCity: "São Paulo",
      },
      limit: 2,
    });

    expect(recommended[0]?.id).toBe("best");
  });
});
