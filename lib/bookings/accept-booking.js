"use strict";

const MAX_BOOKING_ID_LENGTH = 128;

const ACCEPT_ERROR_STATUS = {
  UNAUTHENTICATED: 401,
  INVALID_BOOKING: 400,
  BOOKING_NOT_FOUND: 404,
  FORBIDDEN: 403,
  NOT_PENDING: 409,
  CANCELLED: 409,
  ALREADY_ACCEPTED: 409,
  ALREADY_PAID: 409,
};

const ACCEPT_COPY = {
  tutorButton: "Aceitar",
  tutorSubmitting: "Confirmando...",
  awaitingPayment: "Aguardando pagamento do aluno.",
};

function createCodedError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.httpStatus = ACCEPT_ERROR_STATUS[code] ?? 400;
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

function resolveAcceptActor(booking, actorUid) {
  if (typeof actorUid === "string" && actorUid && booking?.tutorId === actorUid) {
    return "tutor";
  }
  return null;
}

function assertCanAcceptBooking({ actorUid, booking }) {
  if (!actorUid || typeof actorUid !== "string" || !actorUid.trim()) {
    throw createCodedError("Faça login para confirmar esta reserva.", "UNAUTHENTICATED");
  }

  if (!booking) {
    throw createCodedError("Reserva não encontrada.", "BOOKING_NOT_FOUND");
  }

  const actor = resolveAcceptActor(booking, actorUid);
  if (!actor) {
    throw createCodedError(
      "Apenas o professor desta aula pode aceitar a solicitação.",
      "FORBIDDEN",
    );
  }

  if (booking.status === "cancelled") {
    throw createCodedError("Não é possível aceitar uma reserva cancelada.", "CANCELLED");
  }

  if (booking.status !== "pending") {
    throw createCodedError(
      "Só é possível aceitar reservas pendentes.",
      "NOT_PENDING",
    );
  }

  if (booking.paymentStatus === "paid") {
    throw createCodedError("Esta reserva já foi paga.", "ALREADY_PAID");
  }

  const paymentStatus = booking.paymentStatus ?? "unpaid";
  if (paymentStatus !== "unpaid") {
    throw createCodedError(
      "Esta solicitação já foi aceita. Aguarde o pagamento do aluno.",
      "ALREADY_ACCEPTED",
    );
  }
}

function statusFromAcceptBookingError(error) {
  if (error && typeof error === "object" && typeof error.httpStatus === "number") {
    return error.httpStatus;
  }

  const code = error && typeof error === "object" ? error.code : undefined;
  if (code && ACCEPT_ERROR_STATUS[code]) {
    return ACCEPT_ERROR_STATUS[code];
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

async function acceptBookingForTutor(db, rawInput, deps = {}) {
  const actorUid = typeof rawInput?.actorUid === "string" ? rawInput.actorUid.trim() : "";
  if (!actorUid) {
    throw createCodedError("Faça login para confirmar esta reserva.", "UNAUTHENTICATED");
  }

  const bookingId = normalizeBookingId(rawInput?.bookingId);
  if (!bookingId) {
    throw createCodedError("Informe o identificador da reserva.", "INVALID_BOOKING");
  }

  const bookingRef = db.collection("bookings").doc(bookingId);
  const timestamp = deps.timestamp ?? new Date();

  return db.runTransaction(async (tx) => {
    const bookingSnap = await tx.get(bookingRef);
    const booking = snapshotData(bookingSnap);

    assertCanAcceptBooking({ actorUid, booking });

    tx.update(bookingRef, {
      paymentStatus: "awaiting_payment",
      updatedAt: timestamp,
    });

    return {
      bookingId,
      paymentStatus: "awaiting_payment",
    };
  });
}

module.exports = {
  ACCEPT_COPY,
  ACCEPT_ERROR_STATUS,
  assertCanAcceptBooking,
  acceptBookingForTutor,
  normalizeBookingId,
  resolveAcceptActor,
  statusFromAcceptBookingError,
};
