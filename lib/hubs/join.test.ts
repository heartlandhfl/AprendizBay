import { describe, expect, it } from "vitest";
import {
  applyHubJoin,
  evaluateHubJoin,
  hubAcceptsNewStudents,
  simulateConcurrentJoins,
} from "@/lib/hubs/join";

function openHub(overrides: Record<string, unknown> = {}) {
  return {
    tutorId: "tutor-1",
    title: "Inglês para Viagem",
    maxStudents: 2,
    confirmedStudentIds: [] as string[],
    confirmedStudentCount: 0,
    status: "open",
    ...overrides,
  };
}

describe("evaluateHubJoin", () => {
  it("lets the first student take an open seat", () => {
    const decision = evaluateHubJoin(openHub({ maxStudents: 6 }), "student-1");

    expect(decision).toEqual({
      ok: true,
      nextIds: ["student-1"],
      nextCount: 1,
      nextStatus: "open",
    });
  });

  it("fills the class when the last vacancy is taken", () => {
    const decision = evaluateHubJoin(
      openHub({
        confirmedStudentIds: ["student-1"],
        confirmedStudentCount: 1,
      }),
      "student-2",
    );

    expect(decision).toEqual({
      ok: true,
      nextIds: ["student-1", "student-2"],
      nextCount: 2,
      nextStatus: "full",
    });
  });

  it("rejects a second student when two try to take the last seat", () => {
    const { hub, results } = simulateConcurrentJoins(
      openHub({
        confirmedStudentIds: ["already-in"],
        confirmedStudentCount: 1,
      }),
      ["student-a", "student-b"],
    );

    expect(results[0]).toMatchObject({ studentId: "student-a", ok: true, nextStatus: "full" });
    expect(results[1]).toMatchObject({
      studentId: "student-b",
      ok: false,
      code: "full",
    });
    expect(hub.confirmedStudentIds).toEqual(["already-in", "student-a"]);
    expect(hub.confirmedStudentCount).toBe(2);
    expect(hub.status).toBe("full");
    expect(hub.confirmedStudentIds).not.toContain("student-b");
  });

  it("rejects a join when the class is already full", () => {
    const decision = evaluateHubJoin(
      openHub({
        status: "full",
        confirmedStudentIds: ["a", "b"],
        confirmedStudentCount: 2,
      }),
      "student-3",
    );

    expect(decision).toMatchObject({ ok: false, code: "full" });
  });

  it("rejects a join when the class is cancelled", () => {
    const decision = evaluateHubJoin(
      openHub({ status: "cancelled", confirmedStudentIds: [], confirmedStudentCount: 0 }),
      "student-1",
    );

    expect(decision).toMatchObject({ ok: false, code: "cancelled" });
    expect(hubAcceptsNewStudents({ status: "cancelled", maxStudents: 4, confirmedStudentCount: 0 })).toBe(
      false,
    );
  });

  it("rejects a join when the class is closed", () => {
    const decision = evaluateHubJoin(openHub({ status: "closed" }), "student-1");

    expect(decision).toMatchObject({ ok: false, code: "closed" });
  });

  it("does not let a student join twice", () => {
    const decision = evaluateHubJoin(
      openHub({
        confirmedStudentIds: ["student-1"],
        confirmedStudentCount: 1,
        maxStudents: 6,
      }),
      "student-1",
    );

    expect(decision).toMatchObject({ ok: false, code: "already_joined" });
  });

  it("throws when applyHubJoin is called on a full class", () => {
    expect(() =>
      applyHubJoin(
        openHub({
          status: "full",
          confirmedStudentIds: ["a", "b"],
          confirmedStudentCount: 2,
        }),
        "student-3",
      ),
    ).toThrow(/não tem mais vagas/i);
  });
});
