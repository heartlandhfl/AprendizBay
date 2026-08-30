"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const {
  computeTutorRatingFromRatings,
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

async function withFakeDb() {
  let updated;
  const db = {
    collection(name) {
      if (name === "reviews") {
        return {
          where() {
            return {
              get: async () => ({
                docs: [{ data: () => ({ rating: 5 }) }, { data: () => ({ rating: 4 }) }],
              }),
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
              },
            };
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
  };

  const stats = await recomputeTutorRating(db, "tutor-1");
  assert.deepEqual(stats, { rating: 4.5, reviewCount: 2 });
  assert.equal(updated.id, "tutor-1");
  assert.equal(updated.payload.rating, 4.5);
  assert.equal(updated.payload.reviewCount, 2);
  assert.ok(updated.payload.updatedAt);
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

async function postJson(port, body, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api/reviews/recompute-rating`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

async function withHttpRoute() {
  const app = express();
  app.use("/api/reviews", reviewsRouter);
  const { server, port } = await listen(app);

  try {
    const missingTutor = await postJson(port, {});
    assert.equal(missingTutor.status, 400);
    assert.match(String(missingTutor.payload?.error || ""), /professor/);

    const missingToken = await postJson(port, { tutorId: "tutor-1" });
    assert.equal(missingToken.status, 401);
    assert.match(String(missingToken.payload?.error || ""), /Token|autenticação/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

(async () => {
  await withFakeDb();
  await withHttpRoute();
  console.log("test-reviews-api: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
