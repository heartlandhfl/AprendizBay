"use strict";

const {
  authoritativeLessonPrice,
  splitBookingPriceFromCents,
} = require("../payments/money");
const { isMarketplaceVisible } = require("../tutors/verification");
const {
  bookingsOccupancyQuery,
  normalizeTutorId,
  occupiedStartsFromBookingData,
  scheduledAtToIso,
  slotOverlapsOccupiedStarts,
} = require("./occupancy");

const LESSON_SLOTS_COLLECTION = "lessonSlots";
const AVAILABILITY_DOC_ID = "weekly";
const LESSON_DURATION_MINUTES = 60;

const CREATE_BOOKING_ERRORS = {
  UNAUTHENTICATED: "Faça login para reservar esta aula.",
  FORBIDDEN_ROLE: "Apenas alunos podem reservar aulas.",
  INVALID_TUTOR: "Informe o identificador do professor.",
  INVALID_SLOT: "Selecione um horário válido para continuar.",
  SLOT_IN_PAST: "Escolha um horário futuro para reservar a aula.",
  SLOT_NOT_OFFERED: "Este horário não está na disponibilidade do professor.",
  INVALID_PRICE: "O valor desta aula não está disponível.",
  TUTOR_UNAVAILABLE: "Este professor não está disponível para reservas.",
  COLLECTIVE_PATH: "Aulas coletivas devem ser reservadas pela turma.",
  SELF_BOOKING: "Você não pode reservar uma aula com você mesmo.",
  SLOT_TAKEN:
    "Esse horário acabou de ser reservado por outro aluno. Escolha outro horário.",
};

const CREATE_BOOKING_ERROR_STATUS = {
  UNAUTHENTICATED: 401,
  FORBIDDEN_ROLE: 403,
  INVALID_TUTOR: 400,
  INVALID_SLOT: 400,
  SLOT_IN_PAST: 400,
  SLOT_NOT_OFFERED: 409,
  INVALID_PRICE: 400,
  TUTOR_UNAVAILABLE: 409,
  COLLECTIVE_PATH: 400,
  SELF_BOOKING: 403,
  SLOT_TAKEN: 409,
};

function createCodedError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.httpStatus = CREATE_BOOKING_ERROR_STATUS[code] ?? 400;
  return error;
}

/**
 * Uniqueness key for an individual lesson: tutor + scheduledAt (UTC ISO).
 * Document id: lessonSlots/{tutorId}_{scheduledAtIso}
 */
function individualLessonSlotKey(tutorId, scheduledAt) {
  const tutor = normalizeTutorId(tutorId);
  const iso = scheduledAtToIso(scheduledAt);
  if (!tutor || !iso) {
    return "";
  }
  return `${tutor}_${iso}`;
}

function timeToMinutes(time) {
  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
    return NaN;
  }
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function parseAvailabilitySlots(data) {
  if (!data || !Array.isArray(data.slots)) {
    return [];
  }

  return data.slots.filter((slot) => {
    return (
      slot &&
      typeof slot.weekday === "number" &&
      slot.weekday >= 0 &&
      slot.weekday <= 6 &&
      Number.isFinite(timeToMinutes(slot.startTime)) &&
      Number.isFinite(timeToMinutes(slot.endTime))
    );
  });
}

/** Same hour-aligned windows the student picker offers. Uses local timezone. */
function isOfferedIndividualSlot(scheduledAt, availabilitySlots) {
  if (!(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
    return false;
  }
  if (scheduledAt.getSeconds() !== 0 || scheduledAt.getMilliseconds() !== 0) {
    return false;
  }

  const weekday = scheduledAt.getDay();
  const startMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();

  return availabilitySlots.some((slot) => {
    if (slot.weekday !== weekday) {
      return false;
    }
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return false;
    }
    return (
      startMinutes >= start &&
      startMinutes + LESSON_DURATION_MINUTES <= end &&
      (startMinutes - start) % LESSON_DURATION_MINUTES === 0
    );
  });
}

function isActiveHeldBooking(data) {
  return data?.status === "pending" || data?.status === "confirmed";
}

function serverFeeSplit(priceCents) {
  const envPercent =
    process.env.PLATFORM_FEE_PERCENT ?? process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT;
  return splitBookingPriceFromCents(priceCents, envPercent);
}

function evaluateIndividualSlotClaim({ tutorId, scheduledAt, occupiedStarts }) {
  const slotKey = individualLessonSlotKey(tutorId, scheduledAt);
  if (!slotKey) {
    return {
      ok: false,
      code: "INVALID_SLOT",
      message: CREATE_BOOKING_ERRORS.INVALID_SLOT,
    };
  }

  if (slotOverlapsOccupiedStarts(scheduledAt, occupiedStarts)) {
    return {
      ok: false,
      code: "SLOT_TAKEN",
      message: CREATE_BOOKING_ERRORS.SLOT_TAKEN,
    };
  }

  return { ok: true, slotKey };
}

/**
 * Serializes two (or more) individual booking attempts the same way a
 * Firestore transaction retry does: the second reader sees the first write.
 */
function simulateConcurrentIndividualBookings(occupiedStarts, attempts) {
  let currentOccupied = Array.isArray(occupiedStarts) ? [...occupiedStarts] : [];

  const results = attempts.map((attempt) => {
    const decision = evaluateIndividualSlotClaim({
      tutorId: attempt.tutorId,
      scheduledAt: attempt.scheduledAt,
      occupiedStarts: currentOccupied,
    });

    if (decision.ok) {
      const iso = scheduledAtToIso(attempt.scheduledAt);
      currentOccupied = [...currentOccupied, iso].sort();
    }

    return { studentId: attempt.studentId, ...decision };
  });

  return { occupiedStarts: currentOccupied, results };
}

function statusFromCreateBookingError(error) {
  if (error && typeof error === "object" && typeof error.httpStatus === "number") {
    return error.httpStatus;
  }

  const code = error && typeof error === "object" ? error.code : undefined;
  if (code && CREATE_BOOKING_ERROR_STATUS[code]) {
    return CREATE_BOOKING_ERROR_STATUS[code];
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

function parseScheduledAt(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const iso = scheduledAtToIso(value);
  if (!iso) {
    return null;
  }
  return new Date(iso);
}

function assertCanCreateIndividualBooking(input, now = new Date()) {
  const actorUid = typeof input?.actorUid === "string" ? input.actorUid.trim() : "";
  if (!actorUid) {
    throw createCodedError(CREATE_BOOKING_ERRORS.UNAUTHENTICATED, "UNAUTHENTICATED");
  }

  if (input?.type && input.type !== "individual") {
    throw createCodedError(CREATE_BOOKING_ERRORS.COLLECTIVE_PATH, "COLLECTIVE_PATH");
  }

  const tutorId = normalizeTutorId(input?.tutorId);
  if (!tutorId) {
    throw createCodedError(CREATE_BOOKING_ERRORS.INVALID_TUTOR, "INVALID_TUTOR");
  }

  if (actorUid === tutorId) {
    throw createCodedError(CREATE_BOOKING_ERRORS.SELF_BOOKING, "SELF_BOOKING");
  }

  const scheduledAt = parseScheduledAt(input?.scheduledAt);
  if (!scheduledAt) {
    throw createCodedError(CREATE_BOOKING_ERRORS.INVALID_SLOT, "INVALID_SLOT");
  }

  if (scheduledAt.getTime() <= now.getTime()) {
    throw createCodedError(CREATE_BOOKING_ERRORS.SLOT_IN_PAST, "SLOT_IN_PAST");
  }

  return { actorUid, tutorId, scheduledAt };
}

async function loadStudentRole(db, actorUid) {
  const snapshot = await db.collection("users").doc(actorUid).get();
  const data = snapshotData(snapshot);
  return typeof data?.role === "string" ? data.role : undefined;
}

async function loadTutorProfile(db, tutorId) {
  const snapshot = await db.collection("tutors").doc(tutorId).get();
  return snapshotData(snapshot);
}

async function loadTutorAvailabilitySlots(db, tutorId) {
  const snapshot = await db
    .collection("tutors")
    .doc(tutorId)
    .collection("availability")
    .doc(AVAILABILITY_DOC_ID)
    .get();
  return parseAvailabilitySlots(snapshotData(snapshot));
}

async function createIndividualBookingForStudent(db, rawInput, deps = {}) {
  const now = deps.now ?? new Date();
  const { actorUid, tutorId, scheduledAt } = assertCanCreateIndividualBooking(
    rawInput,
    now,
  );

  const claimRole = rawInput?.actorClaimRole;
  if (claimRole && claimRole !== "student") {
    throw createCodedError(CREATE_BOOKING_ERRORS.FORBIDDEN_ROLE, "FORBIDDEN_ROLE");
  }

  const role = rawInput?.actorRole ?? (await loadStudentRole(db, actorUid));
  if (role !== "student") {
    throw createCodedError(CREATE_BOOKING_ERRORS.FORBIDDEN_ROLE, "FORBIDDEN_ROLE");
  }

  const tutor = await loadTutorProfile(db, tutorId);
  if (!tutor || !isMarketplaceVisible(tutor)) {
    throw createCodedError(CREATE_BOOKING_ERRORS.TUTOR_UNAVAILABLE, "TUTOR_UNAVAILABLE");
  }

  const offeredSlots = await loadTutorAvailabilitySlots(db, tutorId);
  if (!isOfferedIndividualSlot(scheduledAt, offeredSlots)) {
    throw createCodedError(CREATE_BOOKING_ERRORS.SLOT_NOT_OFFERED, "SLOT_NOT_OFFERED");
  }

  const authoritative = authoritativeLessonPrice(tutor.individualPrice);
  if (!authoritative) {
    throw createCodedError(CREATE_BOOKING_ERRORS.INVALID_PRICE, "INVALID_PRICE");
  }

  const feeSplit = serverFeeSplit(authoritative.priceCents);
  const price = authoritative.price;
  const timestamp = deps.timestamp ?? now;
  const slotKey = individualLessonSlotKey(tutorId, scheduledAt);
  const slotRef = db.collection(LESSON_SLOTS_COLLECTION).doc(slotKey);
  const bookingRef = db.collection("bookings").doc();
  const occupancyQuery = bookingsOccupancyQuery(db, tutorId);

  return db.runTransaction(async (tx) => {
    const occupancySnap = await tx.get(occupancyQuery);
    const slotSnap = await tx.get(slotRef);

    if (slotSnap.exists) {
      const held = snapshotData(slotSnap);
      const heldBookingId = typeof held?.bookingId === "string" ? held.bookingId : "";
      if (heldBookingId) {
        const heldBookingSnap = await tx.get(db.collection("bookings").doc(heldBookingId));
        const heldBooking = snapshotData(heldBookingSnap);
        if (isActiveHeldBooking(heldBooking)) {
          throw createCodedError(CREATE_BOOKING_ERRORS.SLOT_TAKEN, "SLOT_TAKEN");
        }
      } else if (held?.status === "held") {
        throw createCodedError(CREATE_BOOKING_ERRORS.SLOT_TAKEN, "SLOT_TAKEN");
      }
    }

    const occupiedStarts = occupiedStartsFromBookingData(
      occupancySnap.docs.map((docSnap) => docSnap.data()),
    );

    const decision = evaluateIndividualSlotClaim({
      tutorId,
      scheduledAt,
      occupiedStarts,
    });

    if (!decision.ok) {
      throw createCodedError(decision.message, decision.code);
    }

    const bookingData = {
      studentId: actorUid,
      tutorId,
      type: "individual",
      status: "pending",
      paymentStatus: "unpaid",
      price,
      platformFee: feeSplit.platformFee,
      tutorAmount: feeSplit.tutorAmount,
      scheduledAt,
      createdAt: timestamp,
      slotKey,
    };

    tx.set(bookingRef, bookingData);
    tx.set(slotRef, {
      tutorId,
      scheduledAt,
      scheduledAtIso: scheduledAtToIso(scheduledAt),
      bookingId: bookingRef.id,
      studentId: actorUid,
      status: "held",
      type: "individual",
      updatedAt: timestamp,
    });

    return {
      bookingId: bookingRef.id,
      slotKey,
    };
  });
}

module.exports = {
  CREATE_BOOKING_ERRORS,
  CREATE_BOOKING_ERROR_STATUS,
  LESSON_SLOTS_COLLECTION,
  assertCanCreateIndividualBooking,
  createIndividualBookingForStudent,
  evaluateIndividualSlotClaim,
  individualLessonSlotKey,
  isOfferedIndividualSlot,
  simulateConcurrentIndividualBookings,
  statusFromCreateBookingError,
};
