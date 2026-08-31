"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const {
  ANONYMIZED_DISPLAY_NAME,
  REDACTED_MESSAGE,
  buildBookingAnonymizeUpdate,
  buildConversationAnonymizeUpdate,
  buildReviewAnonymizeUpdate,
  buildTutorAnonymizeUpdate,
  buildTutorHubCloseUpdate,
  deleteUserAccount,
  hasBlockingPaidBooking,
  removeStudentFromHubIds,
} = require("../lib/account/anonymize");
const { accountRouter } = require("../server/api/account");
const { isAllowedFirebaseAdminCaller } = require("../server/next-runtime-guard");

assert.equal(ANONYMIZED_DISPLAY_NAME, "Conta encerrada");
assert.equal(REDACTED_MESSAGE, "[mensagem removida]");

assert.equal(
  hasBlockingPaidBooking([
    { status: "pending", paymentStatus: "unpaid" },
    { status: "completed", paymentStatus: "paid" },
  ]),
  false,
);
assert.equal(
  hasBlockingPaidBooking([{ status: "confirmed", paymentStatus: "paid" }]),
  true,
);

assert.deepEqual(
  buildBookingAnonymizeUpdate("aluno-1", {
    studentId: "aluno-1",
    tutorId: "prof-1",
    status: "pending",
    paymentStatus: "unpaid",
  }),
  { studentAnonymized: true, status: "cancelled" },
);

assert.deepEqual(
  buildBookingAnonymizeUpdate("aluno-1", {
    studentId: "aluno-1",
    tutorId: "prof-1",
    status: "completed",
    paymentStatus: "paid",
  }),
  { studentAnonymized: true },
);

assert.deepEqual(
  buildBookingAnonymizeUpdate("prof-1", {
    studentId: "aluno-1",
    tutorId: "prof-1",
    status: "confirmed",
    paymentStatus: "unpaid",
  }),
  { tutorAnonymized: true, status: "cancelled" },
);

assert.deepEqual(
  buildReviewAnonymizeUpdate("aluno-1", { studentId: "aluno-1", tutorId: "prof-1" }),
  { studentAnonymized: true },
);

assert.deepEqual(buildTutorHubCloseUpdate(), { status: "closed" });
assert.deepEqual(removeStudentFromHubIds(["a", "aluno-1", "b"], "aluno-1"), ["a", "b"]);

const tutorUpdate = buildTutorAnonymizeUpdate("DELETE");
assert.equal(tutorUpdate.name, ANONYMIZED_DISPLAY_NAME);
assert.equal(tutorUpdate.isVerified, false);
assert.equal(tutorUpdate.avatarUrl, "DELETE");
assert.equal(tutorUpdate.bio, "");

assert.deepEqual(
  buildConversationAnonymizeUpdate("aluno-1", { studentId: "aluno-1", tutorId: "prof-1" }),
  { lastMessage: REDACTED_MESSAGE, studentName: ANONYMIZED_DISPLAY_NAME },
);

assert.equal(
  isAllowedFirebaseAdminCaller("/workspace/server/api/account.js"),
  true,
);

function createFakeDb(seed) {
  const updates = [];
  const deletes = [];
  const collections = seed;

  function wrapDocs(docs) {
    return {
      docs,
      size: docs.length,
      get empty() {
        return docs.length === 0;
      },
    };
  }

  function makeRef(collectionName, id) {
    const record = collections[collectionName]?.find((item) => item.id === id);
    return {
      id,
      collectionName,
      path: `${collectionName}/${id}`,
      collection(subName) {
        const rows = record?.subs?.[subName] || [];
        const subCollectionName = `${collectionName}/${id}/${subName}`;
        return {
          get: async () =>
            wrapDocs(rows.map((row) => makeDoc(row.id, row.data, subCollectionName))),
          where(field, _op, value) {
            return {
              get: async () =>
                wrapDocs(
                  rows
                    .filter((row) => row.data[field] === value)
                    .map((row) => makeDoc(row.id, row.data, subCollectionName)),
                ),
            };
          },
        };
      },
    };
  }

  function makeDoc(id, data, collectionName = "unknown") {
    return {
      id,
      data: () => data,
      ref: makeRef(collectionName, id),
    };
  }

  const db = {
    updates,
    deletes,
    collection(name) {
      return {
        doc(id) {
          const record = collections[name]?.find((item) => item.id === id);
          const ref = makeRef(name, id);
          return {
            ...ref,
            get: async () => ({
              exists: Boolean(record),
              data: () => record?.data,
              id,
            }),
            delete: async () => {
              deletes.push({ collection: name, id });
            },
          };
        },
        where(field, op, value) {
          const rows = collections[name] || [];
          const matched = rows.filter((row) => {
            if (op === "array-contains") {
              return Array.isArray(row.data[field]) && row.data[field].includes(value);
            }
            return row.data[field] === value;
          });
          return {
            get: async () => wrapDocs(matched.map((row) => makeDoc(row.id, row.data, name))),
          };
        },
      };
    },
    batch() {
      const ops = [];
      return {
        update(ref, data) {
          ops.push({ type: "update", ref, data });
        },
        delete(ref) {
          ops.push({ type: "delete", ref });
        },
        commit: async () => {
          for (const op of ops) {
            if (op.type === "delete") {
              deletes.push(op.ref);
            } else {
              updates.push({ ref: op.ref, data: op.data });
            }
          }
        },
      };
    },
  };

  return db;
}

async function withFakeAccountDelete() {
  const db = createFakeDb({
    users: [{ id: "aluno-1", data: { role: "student", email: "a@b.com", displayName: "Ana" } }],
    bookings: [
      {
        id: "b1",
        data: {
          studentId: "aluno-1",
          tutorId: "prof-1",
          status: "completed",
          paymentStatus: "paid",
        },
      },
      {
        id: "b2",
        data: {
          studentId: "aluno-1",
          tutorId: "prof-1",
          status: "pending",
          paymentStatus: "unpaid",
        },
      },
    ],
    reviews: [
      {
        id: "r1",
        data: { studentId: "aluno-1", tutorId: "prof-1", rating: 5, comment: "Ótima aula" },
      },
    ],
    conversations: [
      {
        id: "aluno-1_prof-1",
        data: {
          studentId: "aluno-1",
          tutorId: "prof-1",
          participantIds: ["aluno-1", "prof-1"],
          studentName: "Ana",
          lastMessage: "Oi",
        },
        subs: {
          messages: [
            { id: "m1", data: { senderId: "aluno-1", text: "Oi professor" } },
            { id: "m2", data: { senderId: "prof-1", text: "Olá" } },
          ],
        },
      },
    ],
    collectiveHubs: [
      {
        id: "h1",
        data: { tutorId: "outro", confirmedStudentIds: ["aluno-1", "x"] },
      },
    ],
    tutors: [],
  });

  let deletedAuth;
  const FieldValue = {
    serverTimestamp: () => "TS",
    delete: () => "DEL",
  };

  const result = await deleteUserAccount(
    {
      db,
      FieldValue,
      deleteAuthUser: async (uid) => {
        deletedAuth = uid;
      },
    },
    "aluno-1",
  );

  assert.equal(result.deletedUser, true);
  assert.equal(result.bookings, 2);
  assert.equal(result.reviews, 1);
  assert.equal(deletedAuth, "aluno-1");
  assert.ok(db.deletes.some((item) => item.collection === "users" && item.id === "aluno-1"));

  const bookingUpdates = db.updates.filter((item) => item.ref.collectionName === "bookings");
  assert.equal(bookingUpdates.length, 2);
  const cancelled = bookingUpdates.find((item) => item.ref.id === "b2");
  assert.equal(cancelled.data.status, "cancelled");
  assert.equal(cancelled.data.studentAnonymized, true);
  const completed = bookingUpdates.find((item) => item.ref.id === "b1");
  assert.equal(completed.data.status, undefined);
  assert.equal(completed.data.studentAnonymized, true);

  const reviewUpdate = db.updates.find((item) => item.ref.collectionName === "reviews");
  assert.equal(reviewUpdate.data.studentAnonymized, true);
  assert.equal(reviewUpdate.data.comment, undefined);

  const conversationUpdate = db.updates.find(
    (item) => item.ref.collectionName === "conversations",
  );
  assert.equal(conversationUpdate.data.studentName, ANONYMIZED_DISPLAY_NAME);
  assert.equal(conversationUpdate.data.lastMessage, REDACTED_MESSAGE);

  const messageUpdate = db.updates.find((item) =>
    String(item.ref.collectionName).includes("/messages"),
  );
  assert.equal(messageUpdate.data.text, REDACTED_MESSAGE);

  const hubUpdate = db.updates.find((item) => item.ref.collectionName === "collectiveHubs");
  assert.deepEqual(hubUpdate.data.confirmedStudentIds, ["x"]);
}

async function rejectsPaidActiveBooking() {
  const db = createFakeDb({
    users: [{ id: "aluno-1", data: { role: "student" } }],
    bookings: [
      {
        id: "paid",
        data: {
          studentId: "aluno-1",
          tutorId: "prof-1",
          status: "confirmed",
          paymentStatus: "paid",
        },
      },
    ],
    reviews: [],
    conversations: [],
    collectiveHubs: [],
    tutors: [],
  });

  await assert.rejects(
    () =>
      deleteUserAccount(
        {
          db,
          FieldValue: { serverTimestamp: () => "TS", delete: () => "DEL" },
          deleteAuthUser: async () => {},
        },
        "aluno-1",
      ),
    /reservas pagas/,
  );
}

async function rejectsAdminDelete() {
  const db = createFakeDb({
    users: [{ id: "adm", data: { role: "admin" } }],
    bookings: [],
    reviews: [],
    conversations: [],
    collectiveHubs: [],
    tutors: [],
  });

  await assert.rejects(
    () =>
      deleteUserAccount(
        {
          db,
          FieldValue: { serverTimestamp: () => "TS", delete: () => "DEL" },
          deleteAuthUser: async () => {},
        },
        "adm",
      ),
    /administrador/,
  );
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

async function withHttpRoute() {
  const app = express();
  app.use("/api/account", accountRouter);
  const { server, port } = await listen(app);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/account/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const payload = await response.json();
    assert.equal(response.status, 401);
    assert.match(String(payload?.error || ""), /Token|autenticação/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

(async () => {
  await withFakeAccountDelete();
  await rejectsPaidActiveBooking();
  await rejectsAdminDelete();
  await withHttpRoute();
  console.log("test-account-api: ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
