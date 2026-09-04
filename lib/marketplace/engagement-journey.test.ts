import { describe, expect, it } from "vitest";
import { conversationIdFor } from "@/lib/conversations/ids";
import { assertCanCreateReview } from "@/lib/reviews/create-review";
import { evaluateHubJoin, HUB_STATUSES } from "@/lib/hubs/join";
import { evaluateHubLeave } from "@/lib/hubs/leave";

describe("marketplace engagement journeys", () => {
  it("uses deterministic student-tutor conversation ids for messaging routes", () => {
    expect(conversationIdFor("student-1", "tutor-1")).toBe("student-1_tutor-1");
  });

  it("blocks reviews unless the booking is completed and paid", () => {
    expect(() =>
      assertCanCreateReview({
        actorUid: "student-1",
        booking: {
          studentId: "student-1",
          tutorId: "tutor-1",
          status: "completed",
          paymentStatus: "paid",
        },
        existingReview: false,
        tutorId: "tutor-1",
      }),
    ).not.toThrow();

    expect(() =>
      assertCanCreateReview({
        actorUid: "student-1",
        booking: {
          studentId: "student-1",
          tutorId: "tutor-1",
          status: "completed",
          paymentStatus: "unpaid",
        },
        existingReview: false,
        tutorId: "tutor-1",
      }),
    ).toThrow(/aula paga/);
  });

  it("keeps collective hub occupancy server-controlled across join and leave", () => {
    const hub = {
      status: HUB_STATUSES.open,
      maxStudents: 2,
      confirmedStudentCount: 1,
      confirmedStudentIds: [],
    };

    const join = evaluateHubJoin(hub, "student-2", {
      alreadyJoined: false,
      confirmedCount: 1,
    });
    expect(join.ok).toBe(true);
    if (!join.ok) {
      throw new Error("expected hub join to succeed");
    }

    const joinedHub = {
      ...hub,
      confirmedStudentCount: join.nextCount,
      status: join.nextStatus,
    };

    const leave = evaluateHubLeave(joinedHub, "student-2", { participantExists: true });
    expect(leave).toMatchObject({
      ok: true,
      nextCount: 1,
      nextStatus: HUB_STATUSES.open,
    });
  });
});
