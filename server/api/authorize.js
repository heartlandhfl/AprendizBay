"use strict";

const { assertAdminFromClaims } = require("../../lib/admin/authorize");
const { verifyIdToken } = require("./firebase-admin");

async function requireAdminUid(idToken) {
  const { uid, customClaims } = await verifyIdToken(idToken);
  assertAdminFromClaims(customClaims);
  return uid;
}

module.exports = {
  requireAdminUid,
};
