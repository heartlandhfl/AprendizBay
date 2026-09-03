"use strict";

function createAdminAuthError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * @deprecated Profile role is not authoritative. Prefer assertAdminFromClaims().
 */
function assertAdminUser(userData) {
  if (!userData || userData.role !== "admin") {
    throw createAdminAuthError("Acesso restrito a administradores.", "FORBIDDEN");
  }
}

function assertAdminFromClaims(customClaims) {
  const { roleFromDecodedToken } = require("../auth/role-server.js");
  if (roleFromDecodedToken(customClaims) !== "admin") {
    throw createAdminAuthError("Acesso restrito a administradores.", "FORBIDDEN");
  }
}

function statusFromAdminError(error) {
  const code = error && typeof error === "object" ? error.code : undefined;
  const message = error instanceof Error ? error.message : "";

  if (code === "FORBIDDEN" || message.includes("administradores")) {
    return 403;
  }
  if (
    message.includes("Token") ||
    message.includes("autenticação") ||
    message.includes("id-token") ||
    message.includes("Decoding Firebase ID token")
  ) {
    return 401;
  }
  if (message.includes("Firebase Admin")) {
    return 503;
  }
  return 500;
}

module.exports = {
  assertAdminFromClaims,
  assertAdminUser,
  createAdminAuthError,
  statusFromAdminError,
};
