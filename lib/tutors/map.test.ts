import { describe, expect, it } from "vitest";
import type { FirestoreTutorDoc } from "@/lib/tutors/firestore-types";
import { mapFirestoreTutorDoc } from "@/lib/tutors/map";

describe("mapFirestoreTutorDoc", () => {
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
