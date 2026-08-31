"use strict";

const { assertAdminUser } = require("../../lib/admin/authorize");
const { getAdminFirestore, verifyIdToken } = require("./firebase-admin");

async function requireAdminUid(idToken) {
  const { uid } = await verifyIdToken(idToken);
  const snapshot = await getAdminFirestore().collection("users").doc(uid).get();
  assertAdminUser(snapshot.exists ? snapshot.data() : null);
  return uid;
}

module.exports = {
  requireAdminUid,
};
