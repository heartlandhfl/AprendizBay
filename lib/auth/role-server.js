"use strict";

/**
 * CommonJS entry for Express routes and Node scripts.
 * TypeScript source: lib/auth/role-server.ts
 */

const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const {
  isCanonicalRole,
  normalizeRole,
  profileRoleForCanonical,
} = require("./roles.js");

function getAdminApp() {
  const { getAdminApp: getApp } = require("../../server/api/firebase-admin");
  return getApp();
}

function roleFromDecodedToken(decoded) {
  const claim = decoded && decoded.role;
  return typeof claim === "string" ? normalizeRole(claim) : null;
}

async function getRole(uid) {
  const user = await getAuth(getAdminApp()).getUser(uid);
  return roleFromDecodedToken(user.customClaims);
}

async function hasRole(uid, role) {
  return (await getRole(uid)) === role;
}

async function isAdmin(uid) {
  return hasRole(uid, "admin");
}

async function isLecturer(uid) {
  return hasRole(uid, "lecturer");
}

async function isFacilitator(uid) {
  return hasRole(uid, "facilitator");
}

async function isSupport(uid) {
  return hasRole(uid, "support");
}

async function syncProfileRole(uid, role, extras = {}) {
  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(uid);
  const snapshot = await ref.get();
  const payload = {
    role,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (extras.email) payload.email = extras.email;
  if (extras.displayName) payload.displayName = extras.displayName;

  if (snapshot.exists) {
    await ref.set(payload, { merge: true });
    return;
  }

  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    displayName: extras.displayName || "Usuário",
    email: extras.email || "",
  });
}

async function setRole(uid, role, extras = {}) {
  if (!isCanonicalRole(role)) {
    throw new Error(`Papel inválido: ${role}`);
  }

  const auth = getAuth(getAdminApp());
  await auth.setCustomUserClaims(uid, { role });
  await syncProfileRole(uid, profileRoleForCanonical(role), extras);
}

async function removeRole(uid) {
  const auth = getAuth(getAdminApp());
  await auth.setCustomUserClaims(uid, { role: "student" });
  await syncProfileRole(uid, "student");
}

async function syncSignupRoleFromProfile(uid) {
  const db = getFirestore(getAdminApp());
  const snapshot = await db.collection("users").doc(uid).get();
  if (!snapshot.exists) return null;

  const data = snapshot.data() || {};
  const normalized = normalizeRole(typeof data.role === "string" ? data.role : null);

  if (normalized === "lecturer") {
    const tutorSnapshot = await db.collection("tutors").doc(uid).get();
    const tutorData = tutorSnapshot.exists ? tutorSnapshot.data() : null;
    const verificationStatus =
      typeof tutorData?.verificationStatus === "string"
        ? tutorData.verificationStatus
        : tutorData?.isVerified === true
          ? "approved"
          : "pending";

    if (verificationStatus !== "approved") {
      return "lecturer";
    }

    const auth = getAuth(getAdminApp());
    const user = await auth.getUser(uid);
    if (roleFromDecodedToken(user.customClaims) !== "lecturer") {
      await setRole(uid, "lecturer", {
        email: typeof data.email === "string" ? data.email : user.email,
        displayName:
          typeof data.displayName === "string" ? data.displayName : user.displayName,
      });
    }
    return "lecturer";
  }

  if (normalized === "student") {
    return "student";
  }

  return null;
}

function assertAdminFromClaims(decoded) {
  if (roleFromDecodedToken(decoded) !== "admin") {
    const error = new Error("Acesso restrito a administradores.");
    error.code = "FORBIDDEN";
    throw error;
  }
}

function assertStudentActor(decoded) {
  const claim = roleFromDecodedToken(decoded);
  if (claim && claim !== "student") {
    throw new Error("Apenas alunos podem realizar esta ação.");
  }
}

module.exports = {
  assertAdminFromClaims,
  assertStudentActor,
  getRole,
  hasRole,
  isAdmin,
  isFacilitator,
  isLecturer,
  isSupport,
  removeRole,
  roleFromDecodedToken,
  setRole,
  syncSignupRoleFromProfile,
};
