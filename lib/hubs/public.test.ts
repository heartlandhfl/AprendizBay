import { describe, expect, it } from "vitest";
import {
  collectiveSavingsPercent,
  formatVacancyLabel,
  publicHubOmitsStudentIds,
  toPublicCollectiveHub,
} from "@/lib/hubs/public";

describe("toPublicCollectiveHub", () => {
  it("never copies confirmedStudentIds onto the public hub", () => {
    const hub = toPublicCollectiveHub(
      "hub-1",
      {
        tutorId: "tutor-1",
        title: "Conversação",
        description: "Prática semanal",
        maxStudents: 6,
        confirmedStudentIds: ["secret-student-1", "secret-student-2"],
        confirmedStudentCount: 2,
        currentPrice: 25,
        fullPrice: 18,
        schedule: "Terças, 19h · Online",
        modality: "online",
        status: "open",
        subject: "Inglês",
        tutorName: "Mariana Silva",
        individualPrice: 70,
      },
      "secret-student-1",
    );

    expect(publicHubOmitsStudentIds(hub)).toBe(true);
    expect(hub).not.toHaveProperty("confirmedStudentIds");
    expect(JSON.stringify(hub)).not.toContain("secret-student");
    expect(hub.confirmedStudents).toBe(2);
    expect(hub.isJoined).toBe(true);
    expect(hub.tutorName).toBe("Mariana Silva");
    expect(hub.subject).toBe("Inglês");
  });

  it("marks a stranger as not joined without exposing the roster", () => {
    const hub = toPublicCollectiveHub("hub-2", {
      confirmedStudentIds: ["other-student"],
      confirmedStudentCount: 1,
      maxStudents: 5,
      title: "Python",
      modality: "online",
    });

    expect(hub.isJoined).toBe(false);
    expect(hub).not.toHaveProperty("confirmedStudentIds");
  });
});

describe("formatVacancyLabel", () => {
  it("shows available seats instead of participant names", () => {
    expect(formatVacancyLabel(2, 6)).toBe("Vagas disponíveis: 4 de 6");
    expect(formatVacancyLabel(6, 6)).toBe("Turma completa");
  });
});

describe("collectiveSavingsPercent", () => {
  it("compares the collective price with the individual lesson", () => {
    expect(collectiveSavingsPercent(70, 28)).toBe(60);
    expect(collectiveSavingsPercent(0, 25)).toBe(0);
    expect(collectiveSavingsPercent(20, 25)).toBe(0);
  });
});
