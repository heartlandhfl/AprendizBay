"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const {
  applyAdminVerificationReview,
  applyTutorVerificationResubmit,
  validateAdminReview,
} = require("../lib/tutors/verification");
const { tutorsRouter, statusFromError } = require("../server/api/tutors");
const { isAllowedFirebaseAdminCaller } = require("../server/next-runtime-guard");

assert.equal(isAllowedFirebaseAdminCaller("/workspace/server/api/tutors.js"), true);

const approved = validateAdminReview({
  currentStatus: "pending",
  action: "approve",
});
assert.equal(approved.nextStatus, "approved");

assert.throws(
  () => validateAdminReview({ currentStatus: "pending", action: "suspend", reason: "motivo longo" }),
  /Não é possível/,
);

function createFakeDb(existing) {
  let updated = null;
  const db = {
    collection() {
      return {
        doc() {
          return {
            async get() {
              return {
                exists: Boolean(existing),
                data: () => existing,
              };
            },
            async update(payload) {
              updated = payload;
            },
          };
        },
      };
    },
  };
  return {
    db,
    FieldValue: { serverTimestamp: () => "TIMESTAMP", delete: () => "DELETE" },
    getUpdated: () => updated,
  };
}

async function withFakeReview() {
  const fake = createFakeDb({ verificationStatus: "pending", isVerified: false });
  const result = await applyAdminVerificationReview(fake, {
    tutorId: "tutor-1",
    adminUid: "admin-1",
    action: "approve",
  });
  assert.equal(result.status, "approved");
  assert.equal(fake.getUpdated().isVerified, true);

  await assert.rejects(
    () =>
      applyAdminVerificationReview(fake, {
        tutorId: "tutor-1",
        adminUid: "tutor-1",
        action: "approve",
      }),
    /própria verificação/,
  );

  const resubmitFake = createFakeDb({
    verificationStatus: "changes_requested",
    isVerified: false,
  });
  const resubmit = await applyTutorVerificationResubmit(resubmitFake, { tutorId: "tutor-1" });
  assert.equal(resubmit.status, "pending");
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

async function withHttpRoute() {
  const app = express();
  app.use("/api/tutors", tutorsRouter);
  const { server, port } = await listen(app);

  try {
    const missingToken = await postJson(port, "/api/tutors/review", {
      tutorId: "tutor-1",
      action: "approve",
    });
    assert.equal(missingToken.status, 401);

    const missingResubmitToken = await postJson(port, "/api/tutors/resubmit", {});
    assert.equal(missingResubmitToken.status, 401);

    assert.equal(statusFromError({ code: "FORBIDDEN" }), 403);
    assert.equal(statusFromError({ code: "SELF_REVIEW" }), 403);
    assert.equal(statusFromError({ code: "REASON_REQUIRED" }), 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

(async () => {
  await withFakeReview();
  await withHttpRoute();
  console.log("test-tutors-api: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
