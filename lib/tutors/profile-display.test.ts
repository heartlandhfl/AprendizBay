import { describe, expect, it } from "vitest";
import type { TutorProfile } from "@/lib/tutor-profiles";
import {
  defaultBookingOption,
  hasApprovedVerification,
  hasFirstLessonOffer,
  hasPublicRating,
  offeredLessonTypes,
  presentationText,
  teachingLevels,
  teachingSubjects,
} from "@/lib/tutors/profile-display";

const baseTutor = {
  id: "1",
  name: "Ana",
  subject: "Inglês",
  city: "Recife",
  state: "PE",
  rating: 0,
  reviewCount: 0,
  bio: "Bio curta",
  individualPrice: 70,
  collectivePrice: 25,
  modality: "online" as const,
  lessonTypes: ["individual", "coletivo"] as Array<"individual" | "coletivo">,
  isOnline: false,
  avatarUrl: "",
  avatarColor: "bg-emerald-100",
  isVerified: false,
  collectiveHubs: [],
} satisfies TutorProfile;

describe("profile display guards", () => {
  it("never treats an unverified tutor as verified", () => {
    expect(hasApprovedVerification({ isVerified: false })).toBe(false);
    expect(hasApprovedVerification({ isVerified: true })).toBe(true);
  });

  it("hides rating when there are no real reviews", () => {
    expect(hasPublicRating({ rating: 4.9, reviewCount: 0 })).toBe(false);
    expect(hasPublicRating({ rating: 0, reviewCount: 3 })).toBe(false);
    expect(hasPublicRating({ rating: 4.8, reviewCount: 3 })).toBe(true);
  });

  it("does not invent a free first lesson", () => {
    expect(hasFirstLessonOffer(baseTutor)).toBe(false);
    expect(hasFirstLessonOffer({ ...baseTutor, offersFreeTrial: true })).toBe(true);
    expect(hasFirstLessonOffer({ ...baseTutor, firstLessonPrice: 15 })).toBe(true);
  });

  it("uses stored lesson types and prefers coletivo as the default booking option", () => {
    expect(offeredLessonTypes({ ...baseTutor, lessonTypes: ["individual"] })).toEqual([
      "individual",
    ]);
    expect(defaultBookingOption(baseTutor)).toBe("coletivo");
    expect(defaultBookingOption({ ...baseTutor, lessonTypes: ["individual"] })).toBe(
      "individual",
    );
  });

  it("uses about or bio for the presentation and subject as the discipline", () => {
    expect(presentationText(baseTutor)).toBe("Bio curta");
    expect(presentationText({ ...baseTutor, about: "Texto maior" })).toBe("Texto maior");
    expect(teachingSubjects(baseTutor)).toEqual(["Inglês"]);
    expect(teachingSubjects({ ...baseTutor, subjects: ["Inglês", "TOEFL"] })).toEqual([
      "Inglês",
      "TOEFL",
    ]);
    expect(teachingLevels({ ...baseTutor, educationLevels: ["Idiomas"] })).toEqual([
      "Idiomas",
    ]);
  });
});

