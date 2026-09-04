"use strict";

const MAX_BOOKING_ID_LENGTH = 128;

const COMPLETE_ERROR_STATUS = {
  UNAUTHENTICATED: 401,
  INVALID_BOOKING: 400,
  BOOKING_NOT_FOUND: 404,
  FORBIDDEN: 403,
  PENDING: 409,
  CANCELLED: 409,
  UNPAID: 409,
  ALREADY_COMPLETED: 409,
  TOO_EARLY: 409,
};

const COMPLETE_COPY = {
  tutorSectionTitle: "Aulas confirmadas",
  tutorSectionHelp:
    "Entre na sala no horário agendado. Depois da aula, marque como concluída para o aluno avaliar.",
  tutorButton: "Marcar aula como concluída",
  tutorSubmitting: "Concluindo...",
  tutorBeforeSchedule: "Disponível após o horário agendado.",
  tutorNeedsPayment: "Só é possível concluir uma aula paga e confirmada.",
  studentCompleted: "Aula concluída. Você já pode avaliar o professor.",
  studentCompletedReviewed: "Aula concluída.",
};

function createCodedError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.httpStatus = COMPLETE_ERROR_STATUS[code] ?? 400;
  return error;
}

function normalizeBookingId(bookingId) {
  if (typeof bookingId !== "string") {
    return "";
  }

  const id = bookingId.trim();
  if (
    !id ||
    id.length > MAX_BOOKING_ID_LENGTH ||
    id.includes("/") ||
    id.includes("..")
  ) {
    return "";
  }

  return id;
}

function bookingScheduledAtMs(value) {
  if (!value) {
    return NaN;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "object") {
    if (typeof value.toMillis === "function") {
      return value.toMillis();
    }
    if (typeof value.toDate === "function") {
      return value.toDate().getTime();
    }
    if (typeof value._seconds === "number") {
      return value._seconds * 1000;
    }
    if (typeof value.seconds === "number") {
      return value.seconds * 1000;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).getTime();
  }
  return NaN;
}

function hasScheduledTimePassed(scheduledAt, now = new Date()) {
  const scheduledMs = bookingScheduledAtMs(scheduledAt);
  return Number.isFinite(scheduledMs) && scheduledMs <= now.getTime();
}

function resolveCompleteActor(booking, actorUid, actorClaimRole) {
  if (typeof actorUid === "string" && actorUid && booking?.tutorId === actorUid) {
    return "tutor";
  }
  if (actorClaimRole === "admin") {
    return "admin";
  }
  return null;
}

function assertCanCompleteLesson({ actorUid, actorClaimRole, booking, now = new Date() }) {
  if (!actorUid || typeof actorUid !== "string" || !actorUid.trim()) {
    throw createCodedError("Faça login para concluir esta aula.", "UNAUTHENTICATED");
  }

  if (!booking) {
    throw createCodedError("Reserva não encontrada.", "BOOKING_NOT_FOUND");
  }

  const actor = resolveCompleteActor(booking, actorUid, actorClaimRole);
  if (!actor) {
    throw createCodedError(
      "Apenas o professor desta aula ou um administrador pode marcá-la como concluída.",
      "FORBIDDEN",
    );
  }

  if (booking.status === "completed") {
    throw createCodedError("Esta aula já foi concluída.", "ALREADY_COMPLETED");
  }

  if (booking.status === "cancelled") {
    throw createCodedError(
      "Não é possível concluir uma aula cancelada.",
      "CANCELLED",
    );
  }

  if (booking.status === "pending" || booking.status !== "confirmed") {
    throw createCodedError(
      "Só é possível concluir uma aula confirmada.",
      "PENDING",
    );
  }

  if (booking.paymentStatus !== "paid") {
    throw createCodedError(
      "Só é possível concluir uma aula paga.",
      "UNPAID",
    );
  }

  if (actor === "tutor" && !hasScheduledTimePassed(booking.scheduledAt, now)) {
    throw createCodedError(
      "Só é possível concluir a aula após o horário agendado.",
      "TOO_EARLY",
    );
  }
}

function studentCompletedLessonCopy(status, alreadyReviewed) {
  if (status !== "completed") {
    return null;
  }

  return alreadyReviewed
    ? COMPLETE_COPY.studentCompletedReviewed
    : COMPLETE_COPY.studentCompleted;
}

function canTutorMarkCompleted(booking, now = new Date()) {
  return (
    booking?.status === "confirmed" &&
    booking?.paymentStatus === "paid" &&
    hasScheduledTimePassed(booking.scheduledAt, now)
  );
}

function statusFromCompleteLessonError(error) {
  if (error && typeof error === "object" && typeof error.httpStatus === "number") {
    return error.httpStatus;
  }

  const code = error && typeof error === "object" ? error.code : undefined;
  if (code && COMPLETE_ERROR_STATUS[code]) {
    return COMPLETE_ERROR_STATUS[code];
  }

  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("Token") ||
    message.includes("autenticação") ||
    message.includes("login") ||
    message.includes("id-token") ||
    message.includes("Decoding Firebase ID token")
  ) {
    return 401;
  }
  if (message.includes("Firebase Admin")) {
    return 503;
  }
  return 500;
}

function snapshotData(snapshot) {
  if (!snapshot || !snapshot.exists) {
    return null;
  }
  return snapshot.data() ?? null;
}

async function completeLessonForActor(db, rawInput, deps = {}) {
  const actorUid = typeof rawInput?.actorUid === "string" ? rawInput.actorUid.trim() : "";
  if (!actorUid) {
    throw createCodedError("Faça login para concluir esta aula.", "UNAUTHENTICATED");
  }

  const bookingId = normalizeBookingId(rawInput?.bookingId);
  if (!bookingId) {
    throw createCodedError("Informe o identificador da reserva.", "INVALID_BOOKING");
  }

  const bookingRef = db.collection("bookings").doc(bookingId);
  const timestamp = deps.timestamp ?? new Date();
  const now = deps.now ?? new Date();
  const actorClaimRole =
    typeof rawInput?.actorClaimRole === "string" ? rawInput.actorClaimRole : undefined;

  return db.runTransaction(async (tx) => {
    const bookingSnap = await tx.get(bookingRef);
    const booking = snapshotData(bookingSnap);

    assertCanCompleteLesson({
      actorUid,
      actorClaimRole,
      booking,
      now,
    });

    const payload = {
      status: "completed",
      completedAt: timestamp,
      updatedAt: timestamp,
    };

    tx.update(bookingRef, payload);

    return {
      bookingId,
      status: "completed",
    };
  });
}

module.exports = {
  COMPLETE_COPY,
  COMPLETE_ERROR_STATUS,
  assertCanCompleteLesson,
  canTutorMarkCompleted,
  completeLessonForActor,
  hasScheduledTimePassed,
  normalizeBookingId,
  resolveCompleteActor,
  statusFromCompleteLessonError,
  studentCompletedLessonCopy,
};
