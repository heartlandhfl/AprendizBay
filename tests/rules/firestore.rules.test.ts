import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-aprendiz-bay";
const STUDENT_ID = "student-1";
const TUTOR_ID = "tutor-1";
const ADMIN_ID = "admin-1";

let testEnv: RulesTestEnvironment;

function emulatorTarget() {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const separator = raw.lastIndexOf(":");

  return {
    host: raw.slice(0, separator).replace(/^\[|\]$/g, "") || "127.0.0.1",
    port: Number(raw.slice(separator + 1) || 8080),
  };
}

async function seedBaseDocs(options: { tutorVerified: boolean }) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, "users", STUDENT_ID), {
      role: "student",
      displayName: "Ana Souza",
      email: "ana@test.com",
      createdAt: new Date(),
    });
    await setDoc(doc(db, "users", TUTOR_ID), {
      role: "tutor",
      displayName: "Mariana Silva",
      email: "mariana@test.com",
      createdAt: new Date(),
    });
    await setDoc(doc(db, "users", ADMIN_ID), {
      role: "admin",
      displayName: "Admin",
      email: "admin@test.com",
      createdAt: new Date(),
    });
    await setDoc(doc(db, "tutors", TUTOR_ID), {
      userId: TUTOR_ID,
      name: "Mariana Silva",
      subject: "Inglês",
      individualPrice: 70,
      collectivePrice: 25,
      isVerified: options.tutorVerified,
      rating: 4.9,
      reviewCount: 10,
      createdAt: new Date(),
    });
  });
}

async function seedBooking(bookingId: string, status: "pending" | "confirmed" | "completed") {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "bookings", bookingId), {
      studentId: STUDENT_ID,
      tutorId: TUTOR_ID,
      type: "individual",
      status,
      paymentStatus: "paid",
      price: 70,
      scheduledAt: new Date("2026-09-01T19:00:00Z"),
      createdAt: new Date("2026-08-20T19:00:00Z"),
    });
  });
}

function studentDb() {
  return testEnv.authenticatedContext(STUDENT_ID, { email: "ana@test.com" }).firestore();
}

function tutorDb() {
  return testEnv.authenticatedContext(TUTOR_ID, { email: "mariana@test.com" }).firestore();
}

function adminDb() {
  return testEnv.authenticatedContext(ADMIN_ID, { email: "admin@test.com" }).firestore();
}

function pendingBookingPayload() {
  return {
    studentId: STUDENT_ID,
    tutorId: TUTOR_ID,
    type: "individual" as const,
    status: "pending" as const,
    paymentStatus: "unpaid" as const,
    price: 70,
    platformFee: 7,
    tutorAmount: 63,
    scheduledAt: new Date("2026-09-08T19:00:00Z"),
    createdAt: new Date(),
  };
}

function reviewPayload(bookingId: string) {
  return {
    tutorId: TUTOR_ID,
    studentId: STUDENT_ID,
    bookingId,
    rating: 5,
    comment: "Aula excelente.",
    createdAt: new Date(),
  };
}

beforeAll(async () => {
  const { host, port } = emulatorTarget();

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      host,
      port,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("firestore.rules", () => {
  describe("bookings", () => {
    it("denies a student booking an unverified tutor", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(addDoc(collection(studentDb(), "bookings"), pendingBookingPayload()));
    });

    it("allows a student to book a verified tutor", async () => {
      await seedBaseDocs({ tutorVerified: true });

      await assertSucceeds(
        addDoc(collection(studentDb(), "bookings"), pendingBookingPayload()),
      );
    });
  });

  describe("reviews", () => {
    it("denies a student review when the booking is not completed", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await seedBooking("booking-pending", "pending");
      await seedBooking("booking-confirmed", "confirmed");

      await assertFails(
        addDoc(collection(studentDb(), "reviews"), reviewPayload("booking-pending")),
      );
      await assertFails(
        addDoc(collection(studentDb(), "reviews"), reviewPayload("booking-confirmed")),
      );
    });

    it("allows a student to review a completed booking", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await seedBooking("booking-done", "completed");

      await assertSucceeds(
        addDoc(collection(studentDb(), "reviews"), reviewPayload("booking-done")),
      );
    });
  });

  describe("tutors.isVerified", () => {
    it("denies a tutor changing their own isVerified flag", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(
        updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { isVerified: true }),
      );
    });

    it("still lets a tutor update their public profile fields", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertSucceeds(
        updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), {
          bio: "Professora de inglês com foco em conversação.",
        }),
      );
    });

    it("allows an admin to verify a tutor", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertSucceeds(
        updateDoc(doc(adminDb(), "tutors", TUTOR_ID), { isVerified: true }),
      );
    });
  });
});
