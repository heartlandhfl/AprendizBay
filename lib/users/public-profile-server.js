"use strict";

const PUBLIC_PROFILE_COLLECTION = "public";
const PUBLIC_PROFILE_DOC_ID = "profile";
const FALLBACK_DISPLAY_NAME = "Usuário";

function publicProfileFromUserData(data) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const displayName =
    typeof data.displayName === "string" && data.displayName.trim()
      ? data.displayName.trim()
      : FALLBACK_DISPLAY_NAME;

  return {
    displayName,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
  };
}

function publicProfileRef(db, uid) {
  return db
    .collection("users")
    .doc(uid)
    .collection(PUBLIC_PROFILE_COLLECTION)
    .doc(PUBLIC_PROFILE_DOC_ID);
}

/**
 * Returns only marketplace-safe fields. Never copies email, role, or timestamps.
 */
async function readOrBackfillPublicProfile(db, uid, FieldValue) {
  const profileRef = publicProfileRef(db, uid);
  const existing = await profileRef.get();

  if (existing.exists) {
    return publicProfileFromUserData(existing.data());
  }

  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return null;
  }

  const mapped = publicProfileFromUserData(userSnap.data());
  if (!mapped) {
    return null;
  }

  await profileRef.set({
    ...mapped,
    updatedAt: FieldValue ? FieldValue.serverTimestamp() : new Date(),
  });

  return mapped;
}

module.exports = {
  FALLBACK_DISPLAY_NAME,
  PUBLIC_PROFILE_COLLECTION,
  PUBLIC_PROFILE_DOC_ID,
  publicProfileFromUserData,
  publicProfileRef,
  readOrBackfillPublicProfile,
};
