"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const {
  publicProfileFromUserData,
} = require("../lib/users/public-profile-server");
const { usersRouter } = require("../server/api/users");
const { isAllowedFirebaseAdminCaller } = require("../server/next-runtime-guard");

assert.equal(
  isAllowedFirebaseAdminCaller("/workspace/server/api/users.js"),
  true,
);
assert.equal(
  isAllowedFirebaseAdminCaller("/workspace/lib/users/public-profile.ts"),
  false,
);

const mapped = publicProfileFromUserData({
  role: "tutor",
  email: "mariana@secret.com",
  displayName: "Mariana Silva",
  photoUrl: "https://example.com/m.jpg",
  createdAt: new Date(),
});
assert.deepEqual(mapped, {
  displayName: "Mariana Silva",
  photoUrl: "https://example.com/m.jpg",
});
assert.equal(Object.prototype.hasOwnProperty.call(mapped, "email"), false);
assert.equal(Object.prototype.hasOwnProperty.call(mapped, "role"), false);

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function rejectsMissingToken() {
  const app = express();
  app.use("/api/users", usersRouter);
  const { server, port } = await listen(app);

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/users/public-profile/student-1`,
    );
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.error, "Faça login para continuar.");
    assert.equal(body.email, undefined);
    assert.equal(body.role, undefined);
    assert.equal(body.displayName, undefined);
  } finally {
    server.close();
  }
}

async function rejectsBlankUid() {
  const app = express();
  app.use("/api/users", usersRouter);
  const { server, port } = await listen(app);

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/users/public-profile/%20`,
    );
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, "Informe o identificador do usuário.");
  } finally {
    server.close();
  }
}

(async () => {
  await rejectsMissingToken();
  await rejectsBlankUid();
  console.log("users public-profile API checks passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
