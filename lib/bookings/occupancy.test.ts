import { describe, expect, it } from "vitest";
import {
  loadTutorOccupiedStarts,
  normalizeTutorId,
  occupancyResponse,
  occupiedStartsFromBookingData,
  parseOccupiedStarts,
} from "./occupancy";

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

    expect(occupied).toEqual([
      "2026-09-01T19:00:00.000Z",
      "2026-09-02T14:00:00.000Z",
    ]);
    expect(
      occupied.some((value) => String(value).includes("student") || String(value).includes("pay_")),
    ).toBe(false);
  });
});

describe("occupancyResponse", () => {
  it("exposes only occupiedStarts", () => {
    const response = occupancyResponse([
      "2026-09-01T19:00:00.000Z",
      "not-a-date",
      "2026-09-01T19:00:00.000Z",
    ]);

    expect(Object.keys(response)).toEqual(["occupiedStarts"]);
    expect(response.occupiedStarts).toEqual(["2026-09-01T19:00:00.000Z"]);
  });
});

describe("parseOccupiedStarts", () => {
  it("parses ISO strings into dates and ignores private fields", () => {
    const starts = parseOccupiedStarts({
      occupiedStarts: ["2026-09-01T19:00:00.000Z"],
      studentId: "should-not-leak",
      paymentId: "pay_secret",
    });

    expect(starts).toHaveLength(1);
    expect(starts[0]?.toISOString()).toBe("2026-09-01T19:00:00.000Z");
  });
});

describe("normalizeTutorId", () => {
  it("rejects empty and path-like identifiers", () => {
    expect(normalizeTutorId("")).toBe("");
    expect(normalizeTutorId("  ")).toBe("");
    expect(normalizeTutorId("tutor/../admin")).toBe("");
    expect(normalizeTutorId("tutor-1")).toBe("tutor-1");
  });
});

describe("loadTutorOccupiedStarts", () => {
  it("queries occupancy fields without returning private booking data", async () => {
    let selectedFields: string[] | undefined;
    const db = {
      collection(name: string) {
        expect(name).toBe("bookings");
        return {
          where(field: string, op: string, value: unknown) {
            expect(field).toBe("tutorId");
            expect(op).toBe("==");
            expect(value).toBe("tutor-1");
            return {
              where(statusField: string, statusOp: string, statuses: unknown) {
                expect(statusField).toBe("status");
                expect(statusOp).toBe("in");
                expect(statuses).toEqual(["pending", "confirmed"]);
                return {
                  select(...fields: string[]) {
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
    expect(selectedFields).toEqual(["scheduledAt", "status"]);
    expect(occupied).toEqual(["2026-09-08T19:00:00.000Z"]);
  });
});
