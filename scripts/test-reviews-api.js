"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const { createAdminAuthError } = require("../lib/admin/authorize");
const {
  computeTutorRatingFromRatings,
  createReviewsRouter,
  recomputeTutorRating,
  reviewsRouter,
} = require("../server/api/reviews");
const {
  isAllowedFirebaseAdminCaller,
  isBlockedProductionModule,
} = require("../server/next-runtime-guard");

assert.deepEqual(computeTutorRatingFromRatings([]), { rating: 0, reviewCount: 0 });
assert.deepEqual(computeTutorRatingFromRatings([5]), { rating: 5, reviewCount: 1 });
assert.deepEqual(computeTutorRatingFromRatings([5, 4, 3]), { rating: 4, reviewCount: 3 });
assert.deepEqual(computeTutorRatingFromRatings([5, 4]), { rating: 4.5, reviewCount: 2 });
assert.deepEqual(computeTutorRatingFromRatings([2, 2, 3]), { rating: 2.3, reviewCount: 3 });
assert.deepEqual(computeTutorRatingFromRatings([5, "bad", NaN, 3]), {
  rating: 4,
  reviewCount: 2,
});

assert.equal(
  isAllowedFirebaseAdminCaller("/workspace/server/api/reviews.js"),
  true,
);
assert.equal(
  isAllowedFirebaseAdminCaller("/workspace/node_modules/firebase-admin/lib/app/index.js"),
  true,
);
assert.equal(
  isAllowedFirebaseAdminCaller("/workspace/lib/reviews/server.ts"),
  false,
);
assert.equal(
  isAllowedFirebaseAdminCaller("/workspace/hostinger-next/server/app/bookings/page.js"),
  false,
);
assert.equal(isBlockedProductionModule("next", "/workspace/server.js"), true);
assert.equal(
  isBlockedProductionModule("firebase-admin/firestore", "/workspace/server/api/reviews.js"),
  false,
);
assert.equal(
  isBlockedProductionModule("firebase-admin", "/workspace/lib/reviews/server.ts"),
  true,
);

function createRatingDb(reviews, tutors = {}) {
  let updated = null;
  const created = [];
  const reviewDocs = reviews.map((item) => ({
    id: item.id,
    data: () => item.data,
  }));

  const db = {
    collection(name) {
      if (name === "reviews") {
        return {
          doc(id) {
            return {
              id,
              async get() {
                const found = reviewDocs.find((docSnap) => docSnap.id === id);
                return {
                  exists: Boolean(found),
                  id,
                  data: () => found?.data() ?? null,
                };
              },
            };
          },
          where(field, _op, value) {
            const docs = reviewDocs.filter((docSnap) => docSnap.data()[field] === value);
            return {
              limit() {
                return {
                  async get() {
                    return { empty: docs.length === 0, docs: docs.slice(0, 1) };
                  },
                };
              },
              get: async () => ({ docs }),
            };
          },
        };
      }
      if (name === "tutors") {
        return {
          doc(id) {
            return {
              update: async (payload) => {
                updated = { id, payload };
                tutors[id] = { ...(tutors[id] || {}), ...payload };
              },
            };
          },
        };
      }
      if (name === "bookings") {
        return {
          doc(id) {
            return {
              id,
              async get() {
                if (id !== "booking-1") {
                  return { exists: false, id, data: () => null };
                }
                return {
                  exists: true,
                  id,
                  data: () => ({
                    studentId: "student-1",
                    tutorId: "tutor-1",
                    status: "completed",
                    paymentStatus: "paid",
                  }),
                };
              },
            };
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    async runTransaction(fn) {
      return fn({
        get: (ref) => ref.get(),
        create(ref, data) {
          created.push({ id: ref.id, data });
          reviewDocs.push({ id: ref.id, data: () => data });
        },
      });
    },
  };

  return {
    db,
    getUpdated: () => updated,
    getCreated: () => created,
    getTutor: (id) => tutors[id],
  };
}

async function withFakeDb() {
  const fake = createRatingDb([
    { id: "booking-1", data: { bookingId: "booking-1", tutorId: "tutor-1", rating: 5 } },
    { id: "booking-2", data: { bookingId: "booking-2", tutorId: "tutor-1", rating: 4 } },
  ]);

  const stats = await recomputeTutorRating(fake.db, "tutor-1", { timestamp: "TS" });
  assert.deepEqual(stats, { rating: 4.5, reviewCount: 2, tutorId: "tutor-1" });
  assert.equal(fake.getUpdated().id, "tutor-1");
  assert.equal(fake.getUpdated().payload.rating, 4.5);
  assert.equal(fake.getUpdated().payload.reviewCount, 2);
  assert.equal(fake.getUpdated().payload.updatedAt, "TS");
}

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function postJson(port, path, body, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

function forbiddenAdmin(message = "Acesso restrito a administradores.") {
  return async () => {
    throw createAdminAuthError(message, "FORBIDDEN");
  };
}

async function withHttpRoute() {
  const app = express();
  app.use("/api/reviews", reviewsRouter);
  const { server, port } = await listen(app);

  try {
    const missingToken = await postJson(port, "/api/reviews/recompute-rating", {
      tutorId: "tutor-1",
    });
    assert.equal(missingToken.status, 401);
    assert.match(String(missingToken.payload?.error || ""), /Token|autenticação/i);

    const unauthenticatedCreate = await postJson(port, "/api/reviews", {
      bookingId: "booking-1",
      tutorId: "tutor-1",
      rating: 5,
      comment: "Aula excelente.",
    });
    assert.equal(unauthenticatedCreate.status, 401);
    assert.match(String(unauthenticatedCreate.payload?.error || ""), /Token|autenticação|login/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function withAuthorizedRoutes() {
  const recomputeFake = createRatingDb(
    [
      { id: "booking-1", data: { bookingId: "booking-1", tutorId: "tutor-1", rating: 5 } },
      { id: "booking-2", data: { bookingId: "booking-2", tutorId: "tutor-1", rating: 4 } },
    ],
    { "tutor-1": { rating: 0, reviewCount: 0 } },
  );
  const createFake = createRatingDb([], { "tutor-1": { rating: 0, reviewCount: 0 } });
  const unrelatedCreateFake = createRatingDb([], { "tutor-1": { rating: 0, reviewCount: 0 } });

  const createApp = express();
  createApp.use(
    "/api/reviews",
    createReviewsRouter({
      verifyIdToken: async (token) => {
        if (token === "student-token") return { uid: "student-1" };
        if (token === "unrelated-token") return { uid: "student-2" };
        throw new Error("Token de autenticação ausente.");
      },
      requireAdminUid: forbiddenAdmin(),
      getAdminFirestore: () => createFake.db,
      timestamp: "TS",
    }),
  );

  const recomputeApp = express();
  recomputeApp.use(
    "/api/reviews",
    createReviewsRouter({
      verifyIdToken: async () => ({ uid: "ignored" }),
      requireAdminUid: async (token) => {
        if (!token) {
          throw new Error("Token de autenticação ausente.");
        }
        if (token === "admin-token") {
          return "admin-1";
        }
        throw createAdminAuthError("Acesso restrito a administradores.", "FORBIDDEN");
      },
      getAdminFirestore: () => recomputeFake.db,
      timestamp: "TS",
    }),
  );

  const unrelatedApp = express();
  unrelatedApp.use(
    "/api/reviews",
    createReviewsRouter({
      verifyIdToken: async (token) => {
        if (token === "unrelated-token") return { uid: "student-2" };
        throw new Error("Token de autenticação ausente.");
      },
      requireAdminUid: forbiddenAdmin(),
      getAdminFirestore: () => unrelatedCreateFake.db,
      timestamp: "TS",
    }),
  );

  const { server: createServer, port: createPort } = await listen(createApp);
  const { server: unrelatedServer, port: unrelatedPort } = await listen(unrelatedApp);
  const { server: recomputeServer, port: recomputePort } = await listen(recomputeApp);

  try {
    const unrelatedCreate = await postJson(
      unrelatedPort,
      "/api/reviews",
      {
        bookingId: "booking-1",
        tutorId: "tutor-1",
        rating: 1,
        comment: "Não é minha aula.",
      },
      { Authorization: "Bearer unrelated-token" },
    );
    assert.equal(unrelatedCreate.status, 403);
    assert.match(String(unrelatedCreate.payload?.error || ""), /suas próprias aulas/);
    assert.equal(unrelatedCreateFake.getCreated().length, 0);
    assert.equal(unrelatedCreateFake.getUpdated(), null);

    const legitimate = await postJson(
      createPort,
      "/api/reviews",
      {
        bookingId: "booking-1",
        tutorId: "tutor-1",
        rating: 5,
        comment: "Aula excelente.",
        studentId: "student-2",
      },
      { Authorization: "Bearer student-token" },
    );
    assert.equal(legitimate.status, 200);
    assert.equal(legitimate.payload.ok, true);
    assert.equal(legitimate.payload.reviewId, "booking-1");
    assert.equal(legitimate.payload.tutorId, "tutor-1");
    assert.equal(legitimate.payload.rating, 5);
    assert.equal(legitimate.payload.reviewCount, 1);
    assert.equal(createFake.getCreated()[0].data.studentId, "student-1");
    assert.equal(createFake.getCreated()[0].data.tutorId, "tutor-1");
    assert.equal(createFake.getUpdated().id, "tutor-1");
    assert.equal(createFake.getUpdated().payload.rating, 5);
    assert.equal(createFake.getUpdated().payload.reviewCount, 1);

    const duplicate = await postJson(
      createPort,
      "/api/reviews",
      {
        bookingId: "booking-1",
        tutorId: "tutor-1",
        rating: 1,
        comment: "Tentativa duplicada.",
      },
      { Authorization: "Bearer student-token" },
    );
    assert.equal(duplicate.status, 409);
    assert.match(String(duplicate.payload?.error || ""), /já foi avaliada/);

    const studentRecompute = await postJson(
      recomputePort,
      "/api/reviews/recompute-rating",
      { tutorId: "tutor-1" },
      { Authorization: "Bearer student-token" },
    );
    assert.equal(studentRecompute.status, 403);
    assert.match(String(studentRecompute.payload?.error || ""), /administradores/);

    const tutorRecompute = await postJson(
      recomputePort,
      "/api/reviews/recompute-rating",
      { tutorId: "tutor-1" },
      { Authorization: "Bearer tutor-token" },
    );
    assert.equal(tutorRecompute.status, 403);
    assert.match(String(tutorRecompute.payload?.error || ""), /administradores/);

    const unrelatedRecompute = await postJson(
      recomputePort,
      "/api/reviews/recompute-rating",
      { tutorId: "tutor-1" },
      { Authorization: "Bearer unrelated-token" },
    );
    assert.equal(unrelatedRecompute.status, 403);
    assert.match(String(unrelatedRecompute.payload?.error || ""), /administradores/);
    assert.equal(recomputeFake.getUpdated(), null);

    const adminMissingTutor = await postJson(
      recomputePort,
      "/api/reviews/recompute-rating",
      {},
      { Authorization: "Bearer admin-token" },
    );
    assert.equal(adminMissingTutor.status, 400);
    assert.match(String(adminMissingTutor.payload?.error || ""), /professor/);

    const adminRecompute = await postJson(
      recomputePort,
      "/api/reviews/recompute-rating",
      { tutorId: "tutor-1" },
      { Authorization: "Bearer admin-token" },
    );
    assert.equal(adminRecompute.status, 200);
    assert.equal(adminRecompute.payload.ok, true);
    assert.equal(adminRecompute.payload.rating, 4.5);
    assert.equal(adminRecompute.payload.reviewCount, 2);
    assert.equal(recomputeFake.getUpdated().id, "tutor-1");
    assert.equal(recomputeFake.getUpdated().payload.rating, 4.5);
    assert.equal(recomputeFake.getUpdated().payload.reviewCount, 2);
  } finally {
    await new Promise((resolve) => createServer.close(resolve));
    await new Promise((resolve) => unrelatedServer.close(resolve));
    await new Promise((resolve) => recomputeServer.close(resolve));
  }
}

(async () => {
  await withFakeDb();
  await withHttpRoute();
  await withAuthorizedRoutes();
  console.log("test-reviews-api: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
