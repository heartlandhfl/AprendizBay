"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const { occupiedStartsFromBookingData, occupancyResponse } = require("../lib/bookings/occupancy");
const { bookingsRouter } = require("../server/api/bookings");
const { isAllowedFirebaseAdminCaller } = require("../server/next-runtime-guard");

assert.equal(
  isAllowedFirebaseAdminCaller("/workspace/server/api/bookings.js"),
  true,
);
assert.equal(
  isAllowedFirebaseAdminCaller("/workspace/lib/bookings/server.ts"),
  false,
);

const occupancy = occupancyResponse(
  occupiedStartsFromBookingData([
    {
      status: "pending",
      studentId: "student-b",
      studentName: "Bruno",
      paymentId: "pay_secret",
      scheduledAt: new Date("2026-09-01T19:00:00.000Z"),
    },
  ]),
);
assert.deepEqual(Object.keys(occupancy), ["occupiedStarts"]);
assert.deepEqual(occupancy.occupiedStarts, ["2026-09-01T19:00:00.000Z"]);

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function getJson(port, path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

async function withHttpRoute() {
  const app = express();
  app.use("/api/bookings", bookingsRouter);
  const { server, port } = await listen(app);

  try {
    const missingTutor = await getJson(port, "/api/bookings/occupancy");
    assert.equal(missingTutor.status, 400);
    assert.match(String(missingTutor.payload?.error || ""), /professor/);
    assert.equal("occupiedStarts" in (missingTutor.payload || {}), false);

    const invalidTutor = await getJson(port, "/api/bookings/occupancy?tutorId=tutor/../admin");
    assert.equal(invalidTutor.status, 400);

    const previous = {
      FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
      FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    };
    delete process.env.FIREBASE_ADMIN_PROJECT_ID;
    delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    try {
      const unavailable = await getJson(port, "/api/bookings/occupancy?tutorId=tutor-1");
      assert.equal(unavailable.status, 503);
      assert.match(String(unavailable.payload?.error || ""), /horários/);
      assert.equal("occupiedStarts" in (unavailable.payload || {}), false);
      assert.equal("studentId" in (unavailable.payload || {}), false);
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value == null) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

(async () => {
  await withHttpRoute();
  console.log("test-bookings-api: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
