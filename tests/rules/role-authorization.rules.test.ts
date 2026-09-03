import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-aprendiz-bay";
const STUDENT_ID = "student-1";
const TUTOR_ID = "tutor-1";
const ADMIN_ID = "admin-1";
const PROFILE_ONLY_ADMIN_ID = "admin-profile-only";
const FACILITATOR_ID = "facilitator-1";
const SUPPORT_ID = "support-1";

let testEnv: RulesTestEnvironment;

function emulatorTarget() {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const separator = raw.lastIndexOf(":");

  return {
    host: raw.slice(0, separator).replace(/^\[|\]$/g, "") || "127.0.0.1",
    port: Number(raw.slice(separator + 1) || 8080),
  };
}

async function seedUsers() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const users = [
      [STUDENT_ID, { role: "student", displayName: "Ana", email: "ana@test.com" }],
      [TUTOR_ID, { role: "tutor", displayName: "Mariana", email: "mariana@test.com" }],
      [ADMIN_ID, { role: "admin", displayName: "Admin", email: "admin@test.com" }],
      [
        PROFILE_ONLY_ADMIN_ID,
        { role: "admin", displayName: "Fake Admin", email: "fake-admin@test.com" },
      ],
      [
        FACILITATOR_ID,
        { role: "facilitator", displayName: "Facilitator", email: "fac@test.com" },
      ],
      [SUPPORT_ID, { role: "support", displayName: "Support", email: "support@test.com" }],
    ] as const;

    for (const [uid, data] of users) {
      await setDoc(doc(db, "users", uid), { ...data, createdAt: new Date() });
    }

    await setDoc(doc(db, "tutors", TUTOR_ID), {
      userId: TUTOR_ID,
      name: "Mariana",
      subject: "Inglês",
      individualPrice: 70,
      collectivePrice: 25,
      isVerified: true,
      verificationStatus: "approved",
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
    });

    await setDoc(doc(db, "payments", "payment-1"), {
      bookingId: "booking-1",
      studentId: STUDENT_ID,
      tutorId: TUTOR_ID,
      status: "paid",
      createdAt: new Date(),
    });
  });
}

function dbFor(uid: string, email: string, token: Record<string, unknown> = {}) {
  return testEnv.authenticatedContext(uid, { email, ...token }).firestore();
}

beforeAll(async () => {
  const target = emulatorTarget();
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      host: target.host,
      port: target.port,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedUsers();
});

describe("role authorization (custom claims)", () => {
  it("denies a student becoming privileged roles via profile edit", async () => {
    const student = dbFor(STUDENT_ID, "ana@test.com");

    for (const role of ["admin", "lecturer", "tutor", "facilitator", "support"]) {
      await assertFails(updateDoc(doc(student, "users", STUDENT_ID), { role }));
    }
  });

  it("allows a user to update permitted profile fields without changing role", async () => {
    const student = dbFor(STUDENT_ID, "ana@test.com");

    await assertSucceeds(
      updateDoc(doc(student, "users", STUDENT_ID), {
        displayName: "Ana Atualizada",
        updatedAt: new Date(),
      }),
    );
  });

  it("denies profile-only admin from admin operations", async () => {
    const profileAdmin = dbFor(PROFILE_ONLY_ADMIN_ID, "fake-admin@test.com");

    await assertFails(getDocs(collection(profileAdmin, "users")));
    await assertFails(getDoc(doc(profileAdmin, "users", STUDENT_ID)));
    await assertFails(getDoc(doc(profileAdmin, "payments", "payment-1")));
  });

  it("allows admin custom claim to perform admin operations", async () => {
    const admin = dbFor(ADMIN_ID, "admin@test.com", { role: "admin" });

    await assertSucceeds(getDocs(collection(admin, "users")));
    await assertSucceeds(getDoc(doc(admin, "users", STUDENT_ID)));
    await assertSucceeds(getDoc(doc(admin, "payments", "payment-1")));
  });

  it("allows a lecturer/professor to perform tutor operations", async () => {
    const lecturer = dbFor(TUTOR_ID, "mariana@test.com", { role: "lecturer" });

    await assertSucceeds(getDoc(doc(lecturer, "tutors", TUTOR_ID)));
    await assertSucceeds(
      updateDoc(doc(lecturer, "tutors", TUTOR_ID), {
        bio: "Nova bio",
        updatedAt: new Date(),
      }),
    );
  });

  it("denies facilitator from admin-only operations", async () => {
    const facilitator = dbFor(FACILITATOR_ID, "fac@test.com", { role: "facilitator" });

    await assertFails(getDocs(collection(facilitator, "users")));
    await assertFails(getDoc(doc(facilitator, "payments", "payment-1")));
  });

  it("denies support from financial/admin operations", async () => {
    const support = dbFor(SUPPORT_ID, "support@test.com", { role: "support" });

    await assertFails(getDocs(collection(support, "users")));
    await assertFails(getDoc(doc(support, "payments", "payment-1")));
  });
});
