"use strict";

const {
  evaluateHubJoin,
  hubJoinWrite,
  HUB_JOIN_ERRORS,
  normalizeStudentIds,
  resolvedConfirmedCount,
} = require("./join");
const {
  authoritativeLessonPrice,
  splitBookingPriceFromCents,
} = require("../payments/money");

const JOIN_AND_BOOK_ERRORS = {
  UNAUTHENTICATED: "Faça login para entrar nesta turma.",
  FORBIDDEN_ROLE: HUB_JOIN_ERRORS.unauthorized,
  INVALID_HUB: HUB_JOIN_ERRORS.not_found,
  INVALID_PRICE: "O valor desta turma não está disponível.",
  INVALID_SLOT: "Esta turma ainda não tem um horário válido.",
};

const JOIN_AND_BOOK_ERROR_STATUS = {
  UNAUTHENTICATED: 401,
  FORBIDDEN_ROLE: 403,
  INVALID_HUB: 404,
  INVALID_PRICE: 409,
  INVALID_SLOT: 400,
  not_found: 404,
  already_joined: 409,
  full: 409,
  closed: 409,
  cancelled: 409,
  unauthorized: 403,
};

function createCodedError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.httpStatus = JOIN_AND_BOOK_ERROR_STATUS[code] ?? 400;
  return error;
}

function snapshotData(snapshot) {
  if (!snapshot || !snapshot.exists) {
    return null;
  }
  return snapshot.data() ?? null;
}

function serverFeeSplit(priceCents) {
  const envPercent =
    process.env.PLATFORM_FEE_PERCENT ?? process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT;
  return splitBookingPriceFromCents(priceCents, envPercent);
}

function scheduledAtFromHub(hub) {
  if (hub?.scheduledDate && hub?.startTime) {
    const candidate = new Date(`${hub.scheduledDate}T${hub.startTime}:00`);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate;
    }
  }
  return null;
}

function assertCanJoinCollectiveClass(input) {
  const actorUid = typeof input?.actorUid === "string" ? input.actorUid.trim() : "";
  if (!actorUid) {
    throw createCodedError(JOIN_AND_BOOK_ERRORS.UNAUTHENTICATED, "UNAUTHENTICATED");
  }

  const hubId = typeof input?.hubId === "string" ? input.hubId.trim() : "";
  if (!hubId) {
    throw createCodedError(JOIN_AND_BOOK_ERRORS.INVALID_HUB, "INVALID_HUB");
  }

  return { actorUid, hubId };
}

async function loadStudentRole(db, actorUid) {
  const snapshot = await db.collection("users").doc(actorUid).get();
  const data = snapshotData(snapshot);
  return typeof data?.role === "string" ? data.role : undefined;
}

async function createCollectiveBookingForStudent(db, rawInput, deps = {}) {
  const now = deps.now ?? new Date();
  const { actorUid, hubId } = assertCanJoinCollectiveClass(rawInput);

  const claimRole = rawInput?.actorClaimRole;
  if (claimRole && claimRole !== "student") {
    throw createCodedError(JOIN_AND_BOOK_ERRORS.FORBIDDEN_ROLE, "FORBIDDEN_ROLE");
  }

  const role = rawInput?.actorRole ?? (await loadStudentRole(db, actorUid));
  if (role !== "student") {
    throw createCodedError(JOIN_AND_BOOK_ERRORS.FORBIDDEN_ROLE, "FORBIDDEN_ROLE");
  }

  const timestamp = deps.timestamp ?? now;
  const hubRef = db.collection("collectiveHubs").doc(hubId);
  const bookingRef = db.collection("bookings").doc();

  return db.runTransaction(async (tx) => {
    const participantRef = hubRef.collection("participants").doc(actorUid);
    const hubSnap = await tx.get(hubRef);
    const participantSnap = await tx.get(participantRef);
    const hub = snapshotData(hubSnap);
    if (!hub) {
      throw createCodedError(JOIN_AND_BOOK_ERRORS.INVALID_HUB, "INVALID_HUB");
    }

    const legacyIds = normalizeStudentIds(hub.confirmedStudentIds);
    const alreadyJoined = Boolean(participantSnap.exists) || legacyIds.includes(actorUid);
    const confirmedCount = Math.max(resolvedConfirmedCount(hub), legacyIds.length);
    const decision = evaluateHubJoin(hub, actorUid, { alreadyJoined, confirmedCount });
    if (!decision.ok) {
      throw createCodedError(decision.message, decision.code);
    }

    const authoritative = authoritativeLessonPrice(hub.currentPrice);
    if (!authoritative) {
      throw createCodedError(JOIN_AND_BOOK_ERRORS.INVALID_PRICE, "INVALID_PRICE");
    }

    const scheduledAt = scheduledAtFromHub(hub);
    if (!scheduledAt) {
      throw createCodedError(JOIN_AND_BOOK_ERRORS.INVALID_SLOT, "INVALID_SLOT");
    }

    const feeSplit = serverFeeSplit(authoritative.priceCents);
    const tutorId = typeof hub.tutorId === "string" ? hub.tutorId.trim() : "";
    if (!tutorId) {
      throw createCodedError(JOIN_AND_BOOK_ERRORS.INVALID_HUB, "INVALID_HUB");
    }

    const hubUpdate = hubJoinWrite(decision, timestamp);
    if (Object.prototype.hasOwnProperty.call(hub, "confirmedStudentIds") && deps.deleteField) {
      hubUpdate.confirmedStudentIds = deps.deleteField;
    }

    tx.update(hubRef, hubUpdate);
    tx.set(participantRef, {
      studentId: actorUid,
      joinedAt: timestamp,
    });
    tx.set(bookingRef, {
      studentId: actorUid,
      tutorId,
      type: "coletivo",
      status: "pending",
      paymentStatus: "unpaid",
      price: authoritative.price,
      platformFee: feeSplit.platformFee,
      tutorAmount: feeSplit.tutorAmount,
      scheduledAt,
      createdAt: timestamp,
      hubId,
    });

    return {
      bookingId: bookingRef.id,
      hubId,
      price: authoritative.price,
    };
  });
}

function statusFromJoinAndBookError(error) {
  if (error && typeof error === "object" && typeof error.httpStatus === "number") {
    return error.httpStatus;
  }

  const code = error && typeof error === "object" ? error.code : undefined;
  if (code && JOIN_AND_BOOK_ERROR_STATUS[code]) {
    return JOIN_AND_BOOK_ERROR_STATUS[code];
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

module.exports = {
  JOIN_AND_BOOK_ERRORS,
  JOIN_AND_BOOK_ERROR_STATUS,
  assertCanJoinCollectiveClass,
  createCollectiveBookingForStudent,
  scheduledAtFromHub,
  statusFromJoinAndBookError,
};
