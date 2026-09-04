"use strict";

const { HUB_STATUSES, resolvedConfirmedCount } = require("./join");

function shouldReleaseHubSeat(booking) {
  return (
    booking?.type === "coletivo" &&
    typeof booking?.hubId === "string" &&
    booking.hubId.trim().length > 0 &&
    typeof booking?.studentId === "string" &&
    booking.studentId.trim().length > 0
  );
}

function evaluateHubLeave(hub, studentId, extras = {}) {
  if (!hub) {
    return { ok: false, code: "not_found" };
  }

  const participantExists =
    typeof extras.participantExists === "boolean" ? extras.participantExists : true;
  if (!participantExists) {
    return { ok: false, code: "not_participant" };
  }

  const currentCount = resolvedConfirmedCount(hub);
  if (currentCount <= 0) {
    return { ok: false, code: "empty" };
  }

  const nextCount = Math.max(0, currentCount - 1);
  const maxStudents = Number(hub.maxStudents) || 0;
  const currentStatus = hub.status || HUB_STATUSES.open;
  let nextStatus = currentStatus;

  if (currentStatus !== HUB_STATUSES.cancelled) {
    if (maxStudents > 0 && nextCount >= maxStudents) {
      nextStatus = HUB_STATUSES.full;
    } else {
      nextStatus = HUB_STATUSES.open;
    }
  }

  return {
    ok: true,
    nextCount,
    nextStatus,
    studentId,
  };
}

function hubLeaveWrite(decision, timestamp) {
  return {
    confirmedStudentCount: decision.nextCount,
    status: decision.nextStatus,
    updatedAt: timestamp,
  };
}

module.exports = {
  evaluateHubLeave,
  hubLeaveWrite,
  shouldReleaseHubSeat,
};
