import { describe, expect, it } from "vitest";
import { HUB_STATUSES } from "./join";
import { evaluateHubLeave, hubLeaveWrite, shouldReleaseHubSeat } from "./leave";

describe("shouldReleaseHubSeat", () => {
  it("returns true for collective bookings with a hub id", () => {
    expect(
      shouldReleaseHubSeat({
        type: "coletivo",
        hubId: "hub-1",
        studentId: "student-1",
      }),
    ).toBe(true);
  });

  it("returns false for individual bookings", () => {
    expect(
      shouldReleaseHubSeat({
        type: "individual",
        studentId: "student-1",
      }),
    ).toBe(false);
  });
});

describe("evaluateHubLeave", () => {
  const openHub = {
    status: HUB_STATUSES.open,
    maxStudents: 4,
    confirmedStudentCount: 2,
  };

  it("decrements occupancy and keeps the hub open", () => {
    const decision = evaluateHubLeave(openHub, "student-1");
    expect(decision).toMatchObject({
      ok: true,
      nextCount: 1,
      nextStatus: HUB_STATUSES.open,
    });
  });

  it("reopens a full hub after one student leaves", () => {
    const decision = evaluateHubLeave(
      {
        status: HUB_STATUSES.full,
        maxStudents: 2,
        confirmedStudentCount: 2,
      },
      "student-1",
    );

    expect(decision).toMatchObject({
      ok: true,
      nextCount: 1,
      nextStatus: HUB_STATUSES.open,
    });
  });

  it("does not release when the participant doc is missing", () => {
    expect(
      evaluateHubLeave(openHub, "student-1", { participantExists: false }),
    ).toMatchObject({ ok: false, code: "not_participant" });
  });
});

describe("hubLeaveWrite", () => {
  it("writes the next occupancy snapshot", () => {
    const timestamp = new Date("2026-09-01T12:00:00.000Z");
    expect(
      hubLeaveWrite(
        { ok: true, nextCount: 1, nextStatus: HUB_STATUSES.open, studentId: "student-1" },
        timestamp,
      ),
    ).toEqual({
      confirmedStudentCount: 1,
      status: HUB_STATUSES.open,
      updatedAt: timestamp,
    });
  });
});
