import { describe, expect, it } from "vitest";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";
import {
  computeTutorProfileCompletion,
  firstNameFromDisplay,
  profileCompletionHref,
} from "@/lib/tutors/profile-completion";

function completeProfile(): FirestoreTutorDoc {
  return {
    userId: "tutor-1",
    name: "Mariana Silva",
    subject: "Inglês",
    city: "São Paulo",
    state: "SP",
    bio: "Professora de inglês com foco em conversação diária.",
    individualPrice: 70,
    collectivePrice: 25,
    modality: "online",
    isVerified: true,
    isOnline: false,
    rating: 5,
    reviewCount: 3,
    avatarUrl: "https://example.com/avatar.jpg",
    credentialFileName: "diploma.pdf",
  };
}

describe("computeTutorProfileCompletion", () => {
  it("is 0% when the professor profile does not exist", () => {
    const completion = computeTutorProfileCompletion(null);
    expect(completion.percentage).toBe(0);
    expect(completion.hasProfile).toBe(false);
    expect(completion.missing).toHaveLength(7);
    expect(profileCompletionHref(completion)).toBe("/tutor/onboarding");
  });

  it("is 100% when every onboarding field is filled", () => {
    const completion = computeTutorProfileCompletion(completeProfile());
    expect(completion.percentage).toBe(100);
    expect(completion.missing).toEqual([]);
    expect(profileCompletionHref(completion)).toBe("/tutor/settings");
  });

  it("counts missing photo and credential against the existing onboarding steps", () => {
    const completion = computeTutorProfileCompletion({
      ...completeProfile(),
      avatarUrl: undefined,
      credentialFileName: undefined,
      bio: "curta",
    });

    expect(completion.percentage).toBe(57);
    expect(completion.missing).toEqual(["bio", "avatar", "credential"]);
    expect(completion.hasProfile).toBe(true);
  });
});

describe("firstNameFromDisplay", () => {
  it("uses the first word and falls back to Professor", () => {
    expect(firstNameFromDisplay("Mariana Silva")).toBe("Mariana");
    expect(firstNameFromDisplay("  ")).toBe("Professor");
    expect(firstNameFromDisplay(undefined)).toBe("Professor");
  });
});
