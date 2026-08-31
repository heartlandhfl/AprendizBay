"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  loadTutorOccupiedStarts,
  normalizeTutorId,
  occupancyResponse,
  occupiedStartsFromBookingData,
  parseOccupiedStarts,
} = require("./occupancy");

describe("occupiedStartsFromBookingData", () => {
  it("returns only ISO start times for pending and confirmed bookings", () => {
    const occupied = occupiedStartsFromBookingData([
      {
        status: "pending",
        studentId: "student-secret",
        studentName: "Ana Souza",
        paymentId: "pay_secret",
        notes: "Observação privada",
        scheduledAt: new Date("2026-09-01T19:00:00.000Z"),
      },
      {
        status: "confirmed",
        studentId: "student-other",
        scheduledAt: { toDate: () => new Date("2026-09-02T14:00:00.000Z") },
      },
      {
        status: "cancelled",
        scheduledAt: new Date("2026-09-03T19:00:00.000Z"),
      },
      {
        status: "completed",
        scheduledAt: new Date("2026-09-04T19:00:00.000Z"),
      },
    ]);

    assert.deepEqual(occupied, [
      "2026-09-01T19:00:00.000Z",
      "2026-09-02T14:00:00.000Z",
    ]);
    assert.equal(
      occupied.some((value) => String(value).includes("student") || String(value).includes("pay_")),
      false,
    );
  });
});

describe("occupancyResponse", () => {
  it("exposes only occupiedStarts", () => {
    const response = occupancyResponse([
      "2026-09-01T19:00:00.000Z",
      "not-a-date",
      "2026-09-01T19:00:00.000Z",
    ]);

    assert.deepEqual(Object.keys(response), ["occupiedStarts"]);
    assert.deepEqual(response.occupiedStarts, ["2026-09-01T19:00:00.000Z"]);
  });
});

describe("parseOccupiedStarts", () => {
  it("parses ISO strings into dates and ignores private fields", () => {
    const starts = parseOccupiedStarts({
      occupiedStarts: ["2026-09-01T19:00:00.000Z"],
      studentId: "should-not-leak",
      paymentId: "pay_secret",
    });

    assert.equal(starts.length, 1);
    assert.equal(starts[0].toISOString(), "2026-09-01T19:00:00.000Z");
  });
});

describe("normalizeTutorId", () => {
  it("rejects empty and path-like identifiers", () => {
    assert.equal(normalizeTutorId(""), "");
    assert.equal(normalizeTutorId("  "), "");
    assert.equal(normalizeTutorId("tutor/../admin"), "");
    assert.equal(normalizeTutorId("tutor-1"), "tutor-1");
  });
});

describe("loadTutorOccupiedStarts", () => {
  it("queries occupancy fields without returning private booking data", async () => {
    let selectedFields;
    const db = {
      collection(name) {
        assert.equal(name, "bookings");
        return {
          where(field, op, value) {
            assert.equal(field, "tutorId");
            assert.equal(op, "==");
            assert.equal(value, "tutor-1");
            return {
              where(statusField, statusOp, statuses) {
                assert.equal(statusField, "status");
                assert.equal(statusOp, "in");
                assert.deepEqual(statuses, ["pending", "confirmed"]);
                return {
                  select(...fields) {
                    selectedFields = fields;
                    return {
                      get: async () => ({
                        docs: [
                          {
                            id: "booking-secret",
                            data: () => ({
                              status: "pending",
                              scheduledAt: new Date("2026-09-08T19:00:00.000Z"),
                              studentId: "should-not-appear",
                            }),
                          },
                        ],
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

    const occupied = await loadTutorOccupiedStarts(db, "tutor-1");
    assert.deepEqual(selectedFields, ["scheduledAt", "status"]);
    assert.deepEqual(occupied, ["2026-09-08T19:00:00.000Z"]);
  });
});
