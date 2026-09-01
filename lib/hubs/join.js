"use strict";

const HUB_STATUSES = {
  open: "open",
  full: "full",
  closed: "closed",
  cancelled: "cancelled",
};

const HUB_JOIN_ERRORS = {
  not_found: "Turma não encontrada.",
  already_joined: "Você já está nesta turma.",
  full: "Esta turma não tem mais vagas.",
  closed: "Esta turma está fechada e não aceita novos alunos.",
  cancelled: "Esta turma foi cancelada.",
  unauthorized: "Apenas alunos podem entrar em turmas.",
};

function createHubJoinError(code, message) {
  const error = new Error(message || HUB_JOIN_ERRORS[code] || HUB_JOIN_ERRORS.not_found);
  error.code = code;
  return error;
}

function normalizeStudentIds(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }

  return ids.filter((id) => typeof id === "string" && id.length > 0);
}

function resolvedConfirmedCount(hub) {
  if (typeof hub?.confirmedStudentCount === "number" && Number.isFinite(hub.confirmedStudentCount)) {
    return Math.max(0, hub.confirmedStudentCount);
  }

  return normalizeStudentIds(hub?.confirmedStudentIds).length;
}

function isAlreadyJoined(hub, studentId, extras) {
  if (extras && typeof extras.alreadyJoined === "boolean") {
    return extras.alreadyJoined;
  }

  return normalizeStudentIds(hub?.confirmedStudentIds).includes(studentId);
}

function occupancyForJoin(hub, extras) {
  if (extras && typeof extras.confirmedCount === "number" && Number.isFinite(extras.confirmedCount)) {
    return Math.max(0, extras.confirmedCount);
  }

  return resolvedConfirmedCount(hub);
}

function hubAcceptsNewStudents(hub) {
  const status = hub?.status || HUB_STATUSES.open;
  if (status === HUB_STATUSES.cancelled || status === HUB_STATUSES.closed) {
    return false;
  }

  const count = resolvedConfirmedCount(hub);
  const maxStudents = Number(hub?.maxStudents) || 0;
  if (status === HUB_STATUSES.full || count >= maxStudents) {
    return false;
  }

  return status === HUB_STATUSES.open;
}

function evaluateHubJoin(hub, studentId, extras) {
  if (!hub) {
    return { ok: false, code: "not_found", message: HUB_JOIN_ERRORS.not_found };
  }

  if (typeof studentId !== "string" || studentId.length === 0) {
    return { ok: false, code: "unauthorized", message: HUB_JOIN_ERRORS.unauthorized };
  }

  const status = hub.status || HUB_STATUSES.open;
  if (status === HUB_STATUSES.cancelled) {
    return { ok: false, code: "cancelled", message: HUB_JOIN_ERRORS.cancelled };
  }

  if (status === HUB_STATUSES.closed) {
    return { ok: false, code: "closed", message: HUB_JOIN_ERRORS.closed };
  }

  if (isAlreadyJoined(hub, studentId, extras)) {
    return { ok: false, code: "already_joined", message: HUB_JOIN_ERRORS.already_joined };
  }

  const maxStudents = Number(hub.maxStudents) || 0;
  const count = occupancyForJoin(hub, extras);
  if (status === HUB_STATUSES.full || count >= maxStudents) {
    return { ok: false, code: "full", message: HUB_JOIN_ERRORS.full };
  }

  const nextCount = count + 1;
  const nextIds = [...normalizeStudentIds(hub.confirmedStudentIds), studentId];

  return {
    ok: true,
    nextIds,
    nextCount,
    nextStudentId: studentId,
    nextStatus: nextCount >= maxStudents ? HUB_STATUSES.full : HUB_STATUSES.open,
  };
}

function applyHubJoin(hub, studentId) {
  const decision = evaluateHubJoin(hub, studentId);
  if (!decision.ok) {
    throw createHubJoinError(decision.code, decision.message);
  }

  return {
    ...hub,
    confirmedStudentIds: decision.nextIds,
    confirmedStudentCount: decision.nextCount,
    status: decision.nextStatus,
  };
}

/**
 * Serializes two (or more) join attempts the same way a Firestore
 * transaction retry does: the second reader sees the first writer's result.
 */
function simulateConcurrentJoins(hub, studentIds) {
  let current = {
    ...hub,
    confirmedStudentIds: [...normalizeStudentIds(hub?.confirmedStudentIds)],
    confirmedStudentCount: resolvedConfirmedCount(hub),
  };

  const results = studentIds.map((studentId) => {
    const decision = evaluateHubJoin(current, studentId);
    if (decision.ok) {
      current = applyHubJoin(current, studentId);
    }

    return { studentId, ...decision };
  });

  return { hub: current, results };
}

function hubJoinWrite(decision, timestamp) {
  return {
    confirmedStudentCount: decision.nextCount,
    status: decision.nextStatus,
    updatedAt: timestamp,
  };
}

module.exports = {
  HUB_JOIN_ERRORS,
  HUB_STATUSES,
  applyHubJoin,
  createHubJoinError,
  evaluateHubJoin,
  hubAcceptsNewStudents,
  hubJoinWrite,
  normalizeStudentIds,
  resolvedConfirmedCount,
  simulateConcurrentJoins,
};
