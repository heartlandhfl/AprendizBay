import { describe, expect, it } from "vitest";
import {
  assertCanCreateReview,
  computeTutorRatingFromRatings,
  createReviewAndRefreshTutorRating,
  createReviewForStudent,
  planReviewIdMigration,
  ratingsFromReviewDocs,
  recomputeTutorRating,
  reviewDocumentId,
  statusFromCreateReviewError,
  studentReviewAction,
  validateReviewFields,
} from "./create-review";

const COMPLETED_BOOKING = {
  studentId: "student-1",
  tutorId: "tutor-1",
  status: "completed",
  paymentStatus: "paid",
};

function createFakeDb(options: {
  booking?: Record<string, unknown> | null;
  canonicalReview?: Record<string, unknown> | null;
  leftoverReviews?: Array<{ id: string; data: Record<string, unknown> }>;
} = {}) {
  const created: Array<{ id: string; data: Record<string, unknown> }> = [];
  const leftoverReviews = options.leftoverReviews ?? [];
  let canonicalExists = Boolean(options.canonicalReview);

  const reviewRef = {
    id: "booking-1",
    async get() {
      return {
        exists: canonicalExists,
        id: "booking-1",
        data: () => options.canonicalReview ?? null,
      };
    },
  };

  const bookingRef = {
    id: "booking-1",
    async get() {
      return {
        exists: options.booking != null,
        id: "booking-1",
        data: () => options.booking ?? null,
      };
    },
  };

  const db = {
    collection(name: string) {
      if (name === "bookings") {
        return {
          doc() {
            return bookingRef;
          },
        };
      }
      if (name === "reviews") {
        return {
          doc() {
            return reviewRef;
          },
          where() {
            return {
              limit() {
                return {
                  async get() {
                    return {
                      empty: leftoverReviews.length === 0,
                      docs: leftoverReviews.map((item) => ({
                        id: item.id,
                        data: () => item.data,
                      })),
                    };
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    async runTransaction(fn: (tx: {
      get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
      create: (ref: unknown, data: Record<string, unknown>) => void;
    }) => Promise<unknown>) {
      return fn({
        get: (ref) => ref.get(),
        create(_ref, data) {
          canonicalExists = true;
          created.push({ id: "booking-1", data });
        },
      });
    },
  };

  return { db, created };
}

describe("reviewDocumentId", () => {
  it("accepts a booking id and rejects path-like values", () => {
    expect(reviewDocumentId("booking-1")).toBe("booking-1");
    expect(reviewDocumentId("  booking-1  ")).toBe("booking-1");
    expect(reviewDocumentId("")).toBe("");
    expect(reviewDocumentId("reviews/../admin")).toBe("");
  });
});

describe("validateReviewFields", () => {
  const valid = {
    actorUid: "student-1",
    bookingId: "booking-1",
    tutorId: "tutor-1",
    rating: 5,
    comment: "Aula excelente.",
  };

  it("accepts a valid review payload", () => {
    expect(validateReviewFields(valid)).toEqual(valid);
  });

  it("rejects an unauthenticated request", () => {
    expect(() => validateReviewFields({ ...valid, actorUid: "" })).toThrow(
      /Faça login para enviar a avaliação/,
    );
  });

  it("rejects an invalid rating", () => {
    expect(() => validateReviewFields({ ...valid, rating: 0 })).toThrow(/nota de 1 a 5/);
    expect(() => validateReviewFields({ ...valid, rating: 6 })).toThrow(/nota de 1 a 5/);
    expect(() => validateReviewFields({ ...valid, rating: 3.5 })).toThrow(/nota de 1 a 5/);
  });
});

describe("assertCanCreateReview", () => {
  it("allows the student of a completed booking", () => {
    expect(() =>
      assertCanCreateReview({
        actorUid: "student-1",
        booking: COMPLETED_BOOKING,
        existingReview: false,
        tutorId: "tutor-1",
      }),
    ).not.toThrow();
  });

  it("rejects a pending booking", () => {
    expect(() =>
      assertCanCreateReview({
        actorUid: "student-1",
        booking: { ...COMPLETED_BOOKING, status: "pending" },
        existingReview: false,
        tutorId: "tutor-1",
      }),
    ).toThrow(/aula concluída/);
  });

  it("rejects a cancelled booking", () => {
    expect(() =>
      assertCanCreateReview({
        actorUid: "student-1",
        booking: { ...COMPLETED_BOOKING, status: "cancelled" },
        existingReview: false,
        tutorId: "tutor-1",
      }),
    ).toThrow(/aula concluída/);
  });

  it("rejects another student's booking", () => {
    expect(() =>
      assertCanCreateReview({
        actorUid: "student-2",
        booking: COMPLETED_BOOKING,
        existingReview: false,
        tutorId: "tutor-1",
      }),
    ).toThrow(/suas próprias aulas/);
  });

  it("rejects a review for another tutor", () => {
    expect(() =>
      assertCanCreateReview({
        actorUid: "student-1",
        booking: COMPLETED_BOOKING,
        existingReview: false,
        tutorId: "tutor-2",
      }),
    ).toThrow(/professor desta aula/);
  });

  it("rejects a completed booking that was not paid", () => {
    expect(() =>
      assertCanCreateReview({
        actorUid: "student-1",
        booking: { ...COMPLETED_BOOKING, paymentStatus: "unpaid" },
        existingReview: false,
        tutorId: "tutor-1",
      }),
    ).toThrow(/aula paga/);
  });

  it("rejects a duplicate review", () => {
    expect(() =>
      assertCanCreateReview({
        actorUid: "student-1",
        booking: COMPLETED_BOOKING,
        existingReview: true,
        tutorId: "tutor-1",
      }),
    ).toThrow(/já foi avaliada/);
  });
});

describe("createReviewForStudent", () => {
  const input = {
    actorUid: "student-1",
    bookingId: "booking-1",
    tutorId: "tutor-1",
    rating: 5,
    comment: "Aula excelente.",
  };

  it("creates a valid review with the booking id as the document id", async () => {
    const { db, created } = createFakeDb({ booking: COMPLETED_BOOKING });
    const result = await createReviewForStudent(db, input, { timestamp: "TS" });

    expect(result).toEqual({
      reviewId: "booking-1",
      tutorId: "tutor-1",
      bookingId: "booking-1",
    });
    expect(created).toHaveLength(1);
    expect(created[0]?.data).toMatchObject({
      tutorId: "tutor-1",
      studentId: "student-1",
      bookingId: "booking-1",
      rating: 5,
      comment: "Aula excelente.",
    });
  });

  it("rejects a duplicate review for the same booking", async () => {
    const { db, created } = createFakeDb({
      booking: COMPLETED_BOOKING,
      leftoverReviews: [
        {
          id: "legacy-review",
          data: { bookingId: "booking-1", studentId: "student-1" },
        },
      ],
    });

    await expect(createReviewForStudent(db, input)).rejects.toThrow(/já foi avaliada/);
    expect(created).toHaveLength(0);
  });

  it("rejects a review for a pending booking", async () => {
    const { db } = createFakeDb({
      booking: { ...COMPLETED_BOOKING, status: "pending" },
    });

    await expect(createReviewForStudent(db, input)).rejects.toMatchObject({
      code: "BOOKING_NOT_COMPLETED",
    });
  });

  it("rejects a review for a cancelled booking", async () => {
    const { db } = createFakeDb({
      booking: { ...COMPLETED_BOOKING, status: "cancelled" },
    });

    await expect(createReviewForStudent(db, input)).rejects.toMatchObject({
      code: "BOOKING_NOT_COMPLETED",
    });
  });

  it("rejects a review for another student's booking", async () => {
    const { db } = createFakeDb({ booking: COMPLETED_BOOKING });

    await expect(
      createReviewForStudent(db, { ...input, actorUid: "student-2" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN_STUDENT" });
  });

  it("rejects a review for another tutor", async () => {
    const { db } = createFakeDb({ booking: COMPLETED_BOOKING });

    await expect(
      createReviewForStudent(db, { ...input, tutorId: "tutor-2" }),
    ).rejects.toMatchObject({ code: "INVALID_TUTOR" });
  });

  it("rejects an invalid rating", async () => {
    const { db } = createFakeDb({ booking: COMPLETED_BOOKING });

    await expect(createReviewForStudent(db, { ...input, rating: 0 })).rejects.toMatchObject({
      code: "INVALID_RATING",
    });
  });

  it("rejects an unauthenticated request", async () => {
    const { db } = createFakeDb({ booking: COMPLETED_BOOKING });

    await expect(createReviewForStudent(db, { ...input, actorUid: "" })).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(statusFromCreateReviewError({ code: "UNAUTHENTICATED" })).toBe(401);
  });

  it("ignores a client-supplied studentId and uses the authenticated uid", async () => {
    const { db, created } = createFakeDb({ booking: COMPLETED_BOOKING });

    await createReviewForStudent(db, {
      ...input,
      studentId: "student-2",
    } as typeof input & { studentId: string });

    expect(created[0]?.data.studentId).toBe("student-1");
  });
});

function createRatingFakeDb(options: {
  booking?: Record<string, unknown> | null;
  existingReviews?: Array<{ id: string; data: Record<string, unknown> }>;
} = {}) {
  const reviews = new Map<string, Record<string, unknown>>(
    (options.existingReviews ?? []).map((item) => [item.id, item.data]),
  );
  let tutorUpdate: { id: string; payload: Record<string, unknown> } | null = null;

  const db = {
    collection(name: string) {
      if (name === "bookings") {
        return {
          doc(id: string) {
            return {
              id,
              async get() {
                return {
                  exists: options.booking != null,
                  id,
                  data: () => options.booking ?? null,
                };
              },
            };
          },
        };
      }
      if (name === "reviews") {
        return {
          doc(id: string) {
            return {
              id,
              async get() {
                const data = reviews.get(id) ?? null;
                return {
                  exists: Boolean(data),
                  id,
                  data: () => data,
                };
              },
            };
          },
          where(field: string, _op: string, value: string) {
            const docs = Array.from(reviews.entries())
              .filter(([, data]) => data[field] === value)
              .map(([id, data]) => ({ id, data: () => data }));
            return {
              limit() {
                return {
                  async get() {
                    return { empty: docs.length === 0, docs: docs.slice(0, 1) };
                  },
                };
              },
              async get() {
                return { docs };
              },
            };
          },
        };
      }
      if (name === "tutors") {
        return {
          doc(id: string) {
            return {
              async update(payload: Record<string, unknown>) {
                tutorUpdate = { id, payload };
              },
            };
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    async runTransaction(
      fn: (tx: {
        get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
        create: (ref: { id?: string }, data: Record<string, unknown>) => void;
      }) => Promise<unknown>,
    ) {
      return fn({
        get: (ref) => ref.get(),
        create(ref, data) {
          reviews.set(typeof ref.id === "string" ? ref.id : "booking-1", data);
        },
      });
    },
  };

  return {
    db,
    getTutorUpdate: () => tutorUpdate,
    getReviews: () => reviews,
  };
}

describe("createReviewAndRefreshTutorRating", () => {
  const input = {
    actorUid: "student-1",
    bookingId: "booking-1",
    tutorId: "tutor-1",
    rating: 5,
    comment: "Aula excelente.",
  };

  it("creates a legitimate review and updates the tutor rating from that review", async () => {
    const { db, getTutorUpdate, getReviews } = createRatingFakeDb({
      booking: COMPLETED_BOOKING,
    });

    const result = await createReviewAndRefreshTutorRating(db, input, { timestamp: "TS" });

    expect(result).toMatchObject({
      reviewId: "booking-1",
      tutorId: "tutor-1",
      bookingId: "booking-1",
      rating: 5,
      reviewCount: 1,
    });
    expect(getReviews().get("booking-1")).toMatchObject({
      tutorId: "tutor-1",
      studentId: "student-1",
      rating: 5,
    });
    expect(getTutorUpdate()).toEqual({
      id: "tutor-1",
      payload: { rating: 5, reviewCount: 1, updatedAt: "TS" },
    });
  });

  it("computes a deterministic average from existing legitimate reviews", async () => {
    const { db, getTutorUpdate } = createRatingFakeDb({
      booking: COMPLETED_BOOKING,
      existingReviews: [
        {
          id: "booking-0",
          data: { bookingId: "booking-0", tutorId: "tutor-1", rating: 4 },
        },
      ],
    });

    const result = await createReviewAndRefreshTutorRating(db, input, { timestamp: "TS" });

    expect(result.rating).toBe(4.5);
    expect(result.reviewCount).toBe(2);
    expect(getTutorUpdate()?.payload).toMatchObject({ rating: 4.5, reviewCount: 2 });
  });

  it("refuses a duplicate review and does not change the tutor rating", async () => {
    const { db, getTutorUpdate } = createRatingFakeDb({
      booking: COMPLETED_BOOKING,
      existingReviews: [
        {
          id: "booking-1",
          data: { bookingId: "booking-1", tutorId: "tutor-1", rating: 4 },
        },
      ],
    });

    await expect(createReviewAndRefreshTutorRating(db, input)).rejects.toMatchObject({
      code: "DUPLICATE_REVIEW",
    });
    expect(getTutorUpdate()).toBeNull();
  });

  it("writes the booking tutorId even when the client sends a matching tutorId", async () => {
    const { db, getTutorUpdate } = createRatingFakeDb({
      booking: { ...COMPLETED_BOOKING, tutorId: "tutor-1" },
    });

    await createReviewAndRefreshTutorRating(db, input, { timestamp: "TS" });
    expect(getTutorUpdate()?.id).toBe("tutor-1");
  });
});

describe("recomputeTutorRating", () => {
  it("ignores leftover docs for the same booking and uses the canonical rating", async () => {
    const { db, getTutorUpdate } = createRatingFakeDb({
      existingReviews: [
        { id: "legacy-1", data: { bookingId: "booking-1", tutorId: "tutor-1", rating: 2 } },
        { id: "booking-1", data: { bookingId: "booking-1", tutorId: "tutor-1", rating: 5 } },
        { id: "booking-2", data: { bookingId: "booking-2", tutorId: "tutor-1", rating: 4 } },
      ],
    });

    const stats = await recomputeTutorRating(db, "tutor-1", { timestamp: "TS" });
    expect(stats).toEqual({ rating: 4.5, reviewCount: 2, tutorId: "tutor-1" });
    expect(getTutorUpdate()?.payload).toMatchObject({ rating: 4.5, reviewCount: 2 });
  });
});

describe("ratingsFromReviewDocs", () => {
  it("counts one rating per booking and prefers the canonical document", () => {
    const ratings = ratingsFromReviewDocs([
      { id: "legacy-1", data: () => ({ bookingId: "booking-1", rating: 2 }) },
      { id: "booking-1", data: () => ({ bookingId: "booking-1", rating: 5 }) },
      { id: "booking-2", data: () => ({ bookingId: "booking-2", rating: 4 }) },
    ]);

    expect(ratings).toEqual([5, 4]);
    expect(computeTutorRatingFromRatings(ratings)).toEqual({ rating: 4.5, reviewCount: 2 });
  });
});

describe("studentReviewAction", () => {
  it("shows Avaliar aula when the completed booking has no review", () => {
    expect(studentReviewAction("completed", false)).toEqual({
      kind: "button",
      label: "Avaliar aula",
    });
  });

  it("shows Avaliação enviada when the booking was already reviewed", () => {
    expect(studentReviewAction("completed", true)).toEqual({
      kind: "status",
      label: "Avaliação enviada",
    });
  });

  it("hides the review action for pending and cancelled bookings", () => {
    expect(studentReviewAction("pending", false)).toBeNull();
    expect(studentReviewAction("cancelled", false)).toBeNull();
  });
});

describe("planReviewIdMigration", () => {
  it("moves a legacy review to the booking id without touching an existing canonical review", () => {
    const plan = planReviewIdMigration([
      { id: "legacy-a", bookingId: "booking-a", createdAt: new Date("2026-01-01") },
      { id: "booking-b", bookingId: "booking-b", createdAt: new Date("2026-01-02") },
      { id: "legacy-b", bookingId: "booking-b", createdAt: new Date("2026-01-03") },
      { id: "legacy-c1", bookingId: "booking-c", createdAt: new Date("2026-01-04") },
      { id: "legacy-c2", bookingId: "booking-c", createdAt: new Date("2026-01-05") },
      { id: "orphan", bookingId: "../bad" },
    ]);

    expect(plan.moves).toEqual([
      { bookingId: "booking-a", sourceId: "legacy-a", destId: "booking-a" },
      { bookingId: "booking-c", sourceId: "legacy-c1", destId: "booking-c" },
    ]);
    expect(plan.skippedExisting).toEqual([
      { bookingId: "booking-b", reviewId: "booking-b", reason: "canonical_exists" },
    ]);
    expect(plan.leftovers).toEqual([
      { bookingId: "booking-b", reviewId: "legacy-b", reason: "leftover_after_canonical" },
      { bookingId: "booking-c", reviewId: "legacy-c2", reason: "extra_review_kept" },
    ]);
    expect(plan.skippedInvalid).toEqual([
      { reviewId: "orphan", bookingId: "../bad", reason: "invalid_booking_id" },
    ]);
  });
});
