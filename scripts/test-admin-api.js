"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const { assertAdminUser, statusFromAdminError } = require("../lib/admin/authorize");
const { adminRouter } = require("../server/api/admin");
const { isAllowedFirebaseAdminCaller } = require("../server/next-runtime-guard");

assert.equal(isAllowedFirebaseAdminCaller("/workspace/server/api/admin.js"), true);
assert.equal(isAllowedFirebaseAdminCaller("/workspace/server/api/authorize.js"), true);

assert.doesNotThrow(() => assertAdminUser({ role: "admin" }));
assert.throws(() => assertAdminUser({ role: "student" }), /administradores/);
assert.throws(() => assertAdminUser({ role: "tutor" }), /administradores/);
assert.equal(statusFromAdminError({ code: "FORBIDDEN" }), 403);
assert.equal(statusFromAdminError(new Error("Token de autenticação ausente.")), 401);

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function getJson(port, path, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    headers,
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

async function withHttpRoute() {
  const app = express();
  app.use("/api/admin", adminRouter);
  const { server, port } = await listen(app);

  try {
    const missingToken = await getJson(port, "/api/admin/dashboard");
    assert.equal(missingToken.status, 401);
    assert.match(String(missingToken.payload?.error || ""), /Token|autenticação/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

(async () => {
  await withHttpRoute();
  console.log("test-admin-api: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
