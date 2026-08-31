"use strict";

const ANONYMIZED_DISPLAY_NAME = "Conta encerrada";
const REDACTED_MESSAGE = "[mensagem removida]";
const ACTIVE_BOOKING_STATUSES = new Set(["pending", "confirmed"]);

function isActiveBookingStatus(status) {
  return ACTIVE_BOOKING_STATUSES.has(status);
}

function isPaidBooking(data) {
  return data?.paymentStatus === "paid";
}

function hasBlockingPaidBooking(bookings) {
  return bookings.some(
    (booking) => isActiveBookingStatus(booking.status) && isPaidBooking(booking),
  );
}

function buildBookingAnonymizeUpdate(uid, data) {
  const update = {};

  if (data.studentId === uid) {
    update.studentAnonymized = true;
  }
  if (data.tutorId === uid) {
    update.tutorAnonymized = true;
  }
  if (isActiveBookingStatus(data.status) && !isPaidBooking(data)) {
    update.status = "cancelled";
  }

  return update;
}

function buildReviewAnonymizeUpdate(uid, data) {
  const update = {};

  if (data.studentId === uid) {
    update.studentAnonymized = true;
  }
  if (data.tutorId === uid) {
    update.tutorAnonymized = true;
  }

  return update;
}

function buildTutorAnonymizeUpdate(deleteSentinel) {
  return {
    name: ANONYMIZED_DISPLAY_NAME,
    bio: "",
    about: "",
    methodology: "",
    headline: "",
    city: "",
    state: "",
    avatarUrl: deleteSentinel,
    credentialFileName: deleteSentinel,
    isVerified: false,
    verificationStatus: "suspended",
    verificationReason: deleteSentinel,
    reviewedBy: deleteSentinel,
    reviewedAt: deleteSentinel,
    isOnline: false,
  };
}

function buildConversationAnonymizeUpdate(uid, data) {
  const update = {
    lastMessage: REDACTED_MESSAGE,
  };

  if (data.studentId === uid) {
    update.studentName = ANONYMIZED_DISPLAY_NAME;
  }
  if (data.tutorId === uid) {
    update.tutorName = ANONYMIZED_DISPLAY_NAME;
  }

  return update;
}

function buildTutorHubCloseUpdate() {
  return {
    status: "closed",
  };
}

function removeStudentFromHubIds(confirmedStudentIds, uid) {
  return (confirmedStudentIds || []).filter((id) => id !== uid);
}

function removeStudentFromHub(data, uid) {
  const confirmedStudentIds = removeStudentFromHubIds(data.confirmedStudentIds, uid);
  const update = {
    confirmedStudentIds,
    confirmedStudentCount: confirmedStudentIds.length,
  };

  if (data.status === "full" && confirmedStudentIds.length < (data.maxStudents || 0)) {
    update.status = "open";
  }

  return update;
}

async function getDocsByField(db, collectionName, field, value) {
  const snapshot = await db.collection(collectionName).where(field, "==", value).get();
  return snapshot.docs;
}

async function commitChunks(db, writes, chunkSize = 400) {
  for (let index = 0; index < writes.length; index += chunkSize) {
    const batch = db.batch();
    for (const write of writes.slice(index, index + chunkSize)) {
      if (write.type === "delete") {
        batch.delete(write.ref);
      } else {
        batch.update(write.ref, write.data);
      }
    }
    await batch.commit();
  }
}

/**
 * Anonymize bookings, reviews, conversations, tutor profile and hubs.
 * Deletes users/{uid} is left to the caller so Auth can be removed last.
 *
 * @param {{
 *   db: FirebaseFirestore.Firestore,
 *   FieldValue: { serverTimestamp: () => unknown, delete: () => unknown, arrayRemove?: (id: string) => unknown },
 * }} deps
 * @param {string} uid
 */
async function anonymizeRelatedUserData({ db, FieldValue }, uid) {
  const timestamp = FieldValue.serverTimestamp();
  const studentBookings = await getDocsByField(db, "bookings", "studentId", uid);
  const tutorBookings = await getDocsByField(db, "bookings", "tutorId", uid);
  const bookingDocs = uniqueDocs([...studentBookings, ...tutorBookings]);

  const blocking = bookingDocs
    .map((docSnap) => docSnap.data())
    .filter((data) => isActiveBookingStatus(data.status) && isPaidBooking(data));

  if (blocking.length > 0) {
    const error = new Error(
      "Cancele as reservas pagas pendentes ou confirmadas antes de excluir a conta. Isso preserva estornos e o combinado da aula.",
    );
    error.code = "ACTIVE_PAID_BOOKINGS";
    error.bookingCount = blocking.length;
    throw error;
  }

  const writes = [];

  for (const docSnap of bookingDocs) {
    const update = buildBookingAnonymizeUpdate(uid, docSnap.data());
    writes.push({
      type: "update",
      ref: docSnap.ref,
      data: { ...update, anonymizedAt: timestamp, updatedAt: timestamp },
    });
  }

  const studentReviews = await getDocsByField(db, "reviews", "studentId", uid);
  const tutorReviews = await getDocsByField(db, "reviews", "tutorId", uid);
  for (const docSnap of uniqueDocs([...studentReviews, ...tutorReviews])) {
    const update = buildReviewAnonymizeUpdate(uid, docSnap.data());
    if (Object.keys(update).length === 0) {
      continue;
    }
    writes.push({
      type: "update",
      ref: docSnap.ref,
      data: { ...update, anonymizedAt: timestamp },
    });
  }

  const conversations = await db
    .collection("conversations")
    .where("participantIds", "array-contains", uid)
    .get();

  for (const docSnap of conversations.docs) {
    writes.push({
      type: "update",
      ref: docSnap.ref,
      data: {
        ...buildConversationAnonymizeUpdate(uid, docSnap.data()),
        anonymizedAt: timestamp,
        updatedAt: timestamp,
      },
    });

    const messages = await docSnap.ref.collection("messages").where("senderId", "==", uid).get();
    for (const messageSnap of messages.docs) {
      writes.push({
        type: "update",
        ref: messageSnap.ref,
        data: { text: REDACTED_MESSAGE, anonymizedAt: timestamp },
      });
    }
  }

  const tutorRef = db.collection("tutors").doc(uid);
  const tutorSnap = await tutorRef.get();
  if (tutorSnap.exists) {
    writes.push({
      type: "update",
      ref: tutorRef,
      data: {
        ...buildTutorAnonymizeUpdate(FieldValue.delete()),
        anonymizedAt: timestamp,
        updatedAt: timestamp,
      },
    });

    const availability = await tutorRef.collection("availability").get();
    for (const availabilitySnap of availability.docs) {
      writes.push({ type: "delete", ref: availabilitySnap.ref });
    }
  }

  const tutorHubs = await getDocsByField(db, "collectiveHubs", "tutorId", uid);
  for (const docSnap of tutorHubs) {
    writes.push({
      type: "update",
      ref: docSnap.ref,
      data: {
        ...buildTutorHubCloseUpdate(),
        anonymizedAt: timestamp,
        updatedAt: timestamp,
      },
    });
  }

  const studentHubs = await db
    .collection("collectiveHubs")
    .where("confirmedStudentIds", "array-contains", uid)
    .get();

  for (const docSnap of studentHubs.docs) {
    const data = docSnap.data();
    writes.push({
      type: "update",
      ref: docSnap.ref,
      data: {
        ...removeStudentFromHub(data, uid),
        updatedAt: timestamp,
      },
    });
  }

  await commitChunks(db, writes);

  return {
    bookings: bookingDocs.length,
    reviews: uniqueDocs([...studentReviews, ...tutorReviews]).length,
    conversations: conversations.size,
    hubsClosed: tutorHubs.length,
  };
}

function uniqueDocs(docs) {
  const seen = new Set();
  return docs.filter((docSnap) => {
    if (seen.has(docSnap.id)) {
      return false;
    }
    seen.add(docSnap.id);
    return true;
  });
}

/**
 * @param {{
 *   db: FirebaseFirestore.Firestore,
 *   FieldValue: { serverTimestamp: () => unknown, delete: () => unknown },
 *   deleteAuthUser: (uid: string) => Promise<void>,
 *   deleteStoragePrefixes?: (prefixes: string[]) => Promise<void>,
 * }} deps
 * @param {string} uid
 */
async function deleteUserAccount({ db, FieldValue, deleteAuthUser, deleteStoragePrefixes }, uid) {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const role = userSnap.exists ? userSnap.data()?.role : undefined;

  if (role === "admin") {
    const error = new Error("Contas de administrador não podem ser excluídas por este fluxo.");
    error.code = "ADMIN_ACCOUNT";
    throw error;
  }

  const summary = await anonymizeRelatedUserData({ db, FieldValue }, uid);

  if (typeof deleteStoragePrefixes === "function") {
    try {
      await deleteStoragePrefixes([`users/${uid}/`, `tutors/${uid}/`]);
    } catch {
      // Storage cleanup is best-effort; Firestore + Auth still complete.
    }
  }

  if (userSnap.exists) {
    await userRef.delete();
  }

  try {
    await deleteAuthUser(uid);
  } catch (error) {
    const code = error && typeof error === "object" ? error.code : undefined;
    if (code !== "auth/user-not-found") {
      throw error;
    }
  }

  return {
    deletedUser: true,
    ...summary,
  };
}

module.exports = {
  ANONYMIZED_DISPLAY_NAME,
  REDACTED_MESSAGE,
  anonymizeRelatedUserData,
  buildBookingAnonymizeUpdate,
  buildConversationAnonymizeUpdate,
  buildReviewAnonymizeUpdate,
  buildTutorAnonymizeUpdate,
  buildTutorHubCloseUpdate,
  deleteUserAccount,
  hasBlockingPaidBooking,
  removeStudentFromHub,
  removeStudentFromHubIds,
};
