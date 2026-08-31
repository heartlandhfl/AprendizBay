"use strict";

const ACTIVE_OCCUPANCY_STATUSES = new Set(["pending", "confirmed"]);
const OCCUPANCY_POLL_INTERVAL_MS = 30_000;
const LESSON_DURATION_MS = 60 * 60 * 1000;
const MAX_TUTOR_ID_LENGTH = 128;

function occupancyScheduledAtMs(value) {
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

function isActiveOccupancyStatus(status) {
  return ACTIVE_OCCUPANCY_STATUSES.has(status);
}

function occupiedStartsFromBookingData(bookings) {
  const starts = new Set();

  for (const booking of bookings) {
    if (!booking || !isActiveOccupancyStatus(booking.status)) {
      continue;
    }

    const ms = occupancyScheduledAtMs(booking.scheduledAt);
    if (!Number.isFinite(ms)) {
      continue;
    }

    starts.add(new Date(ms).toISOString());
  }

  return Array.from(starts).sort();
}

function scheduledAtToIso(value) {
  const ms = occupancyScheduledAtMs(value);
  if (!Number.isFinite(ms)) {
    return "";
  }
  return new Date(ms).toISOString();
}

function slotOverlapsOccupiedStarts(scheduledAt, occupiedStarts) {
  const start = occupancyScheduledAtMs(scheduledAt);
  if (!Number.isFinite(start)) {
    return false;
  }

  const end = start + LESSON_DURATION_MS;
  const starts = Array.isArray(occupiedStarts) ? occupiedStarts : [];

  return starts.some((value) => {
    const occupiedStart =
      typeof value === "string" ? Date.parse(value) : occupancyScheduledAtMs(value);
    if (!Number.isFinite(occupiedStart)) {
      return false;
    }

    const occupiedEnd = occupiedStart + LESSON_DURATION_MS;
    return start < occupiedEnd && end > occupiedStart;
  });
}

function occupancyResponse(occupiedStarts) {
  const starts = Array.isArray(occupiedStarts)
    ? occupiedStarts.filter(
        (value) => typeof value === "string" && Number.isFinite(Date.parse(value)),
      )
    : [];

  return { occupiedStarts: [...new Set(starts)].sort() };
}

function parseOccupiedStarts(payload) {
  return occupancyResponse(payload?.occupiedStarts).occupiedStarts.map(
    (iso) => new Date(iso),
  );
}

function normalizeTutorId(value) {
  if (typeof value !== "string") {
    return "";
  }

  const tutorId = value.trim();
  if (
    !tutorId ||
    tutorId.length > MAX_TUTOR_ID_LENGTH ||
    tutorId.includes("/") ||
    tutorId.includes("..")
  ) {
    return "";
  }

  return tutorId;
}

function bookingsOccupancyQuery(db, tutorId) {
  let occupancyQuery = db
    .collection("bookings")
    .where("tutorId", "==", tutorId)
    .where("status", "in", ["pending", "confirmed"]);

  if (typeof occupancyQuery.select === "function") {
    occupancyQuery = occupancyQuery.select("scheduledAt", "status");
  }

  return occupancyQuery;
}

async function loadTutorOccupiedStarts(db, tutorId) {
  const snapshot = await bookingsOccupancyQuery(db, tutorId).get();
  return occupiedStartsFromBookingData(snapshot.docs.map((docSnap) => docSnap.data()));
}

module.exports = {
  ACTIVE_OCCUPANCY_STATUSES,
  LESSON_DURATION_MS,
  OCCUPANCY_POLL_INTERVAL_MS,
  bookingsOccupancyQuery,
  isActiveOccupancyStatus,
  loadTutorOccupiedStarts,
  normalizeTutorId,
  occupancyResponse,
  occupiedStartsFromBookingData,
  parseOccupiedStarts,
  scheduledAtToIso,
  slotOverlapsOccupiedStarts,
};
