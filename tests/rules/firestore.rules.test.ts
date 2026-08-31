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
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-aprendiz-bay";
const STUDENT_ID = "student-1";
const STUDENT_B_ID = "student-2";
const TUTOR_ID = "tutor-1";
const TUTOR_B_ID = "tutor-2";
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
    await setDoc(doc(db, "users", STUDENT_B_ID), {
      role: "student",
      displayName: "Bruno Lima",
      email: "bruno@test.com",
      createdAt: new Date(),
    });
    await setDoc(doc(db, "users", TUTOR_ID), {
      role: "tutor",
      displayName: "Mariana Silva",
      email: "mariana@test.com",
      createdAt: new Date(),
    });
    await setDoc(doc(db, "users", TUTOR_B_ID), {
      role: "tutor",
      displayName: "Carlos Mendes",
      email: "carlos@test.com",
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
    await setDoc(doc(db, "tutors", TUTOR_B_ID), {
      userId: TUTOR_B_ID,
      name: "Carlos Mendes",
      subject: "Matemática",
      individualPrice: 60,
      collectivePrice: 20,
      isVerified: options.tutorVerified,
      rating: 4.5,
      reviewCount: 4,
      createdAt: new Date(),
    });
  });
}

async function seedBooking(
  bookingId: string,
  status: "pending" | "confirmed" | "completed" | "cancelled",
  extras: { studentId?: string; tutorId?: string } = {},
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "bookings", bookingId), {
      studentId: extras.studentId ?? STUDENT_ID,
      tutorId: extras.tutorId ?? TUTOR_ID,
      type: "individual",
      status,
      paymentStatus: "paid",
      price: 70,
      studentName: "Nome privado",
      paymentId: "pay_secret",
      notes: "Observação privada",
      scheduledAt: new Date("2026-09-01T19:00:00Z"),
      createdAt: new Date("2026-08-20T19:00:00Z"),
    });
  });
}

function studentDb() {
  return testEnv.authenticatedContext(STUDENT_ID, { email: "ana@test.com" }).firestore();
}

function studentBDb() {
  return testEnv.authenticatedContext(STUDENT_B_ID, { email: "bruno@test.com" }).firestore();
}

function tutorDb() {
  return testEnv.authenticatedContext(TUTOR_ID, { email: "mariana@test.com" }).firestore();
}

function tutorBDb() {
  return testEnv.authenticatedContext(TUTOR_B_ID, { email: "carlos@test.com" }).firestore();
}

function adminDb() {
  return testEnv.authenticatedContext(ADMIN_ID, { email: "admin@test.com" }).firestore();
}

function occupancyQuery(db: ReturnType<typeof studentDb>, tutorId: string) {
  return query(
    collection(db, "bookings"),
    where("tutorId", "==", tutorId),
    where("status", "in", ["pending", "confirmed"]),
  );
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

    describe("read isolation", () => {
      beforeEach(async () => {
        await seedBaseDocs({ tutorVerified: true });
        await seedBooking("booking-student-a", "pending");
        await seedBooking("booking-student-b", "confirmed", {
          studentId: STUDENT_B_ID,
          tutorId: TUTOR_ID,
        });
        await seedBooking("booking-tutor-b", "pending", {
          studentId: STUDENT_B_ID,
          tutorId: TUTOR_B_ID,
        });
      });

      it("denies student A from reading student B's booking", async () => {
        await assertFails(getDoc(doc(studentDb(), "bookings", "booking-student-b")));
        await assertFails(getDoc(doc(studentDb(), "bookings", "booking-tutor-b")));
      });

      it("allows student A to read student A's booking", async () => {
        await assertSucceeds(getDoc(doc(studentDb(), "bookings", "booking-student-a")));
        await assertSucceeds(
          getDocs(
            query(collection(studentDb(), "bookings"), where("studentId", "==", STUDENT_ID)),
          ),
        );
      });

      it("denies the former occupancy query that listed every pending or confirmed booking", async () => {
        await assertFails(getDocs(occupancyQuery(studentDb(), TUTOR_ID)));
        await assertFails(getDocs(occupancyQuery(studentBDb(), TUTOR_ID)));
      });

      it("denies tutor A from reading tutor B's booking", async () => {
        await assertFails(getDoc(doc(tutorDb(), "bookings", "booking-tutor-b")));
        await assertFails(
          getDocs(
            query(collection(tutorDb(), "bookings"), where("tutorId", "==", TUTOR_B_ID)),
          ),
        );
      });

      it("allows tutor A to read their own bookings", async () => {
        await assertSucceeds(getDoc(doc(tutorDb(), "bookings", "booking-student-a")));
        await assertSucceeds(getDoc(doc(tutorDb(), "bookings", "booking-student-b")));
        await assertSucceeds(
          getDocs(
            query(collection(tutorDb(), "bookings"), where("tutorId", "==", TUTOR_ID)),
          ),
        );
      });

      it("allows an admin to read all bookings", async () => {
        await assertSucceeds(getDoc(doc(adminDb(), "bookings", "booking-student-a")));
        await assertSucceeds(getDoc(doc(adminDb(), "bookings", "booking-student-b")));
        await assertSucceeds(getDoc(doc(adminDb(), "bookings", "booking-tutor-b")));
        await assertSucceeds(getDocs(collection(adminDb(), "bookings")));
      });
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

  describe("asaasWebhookReceipts", () => {
    it("denies clients from reading or writing webhook receipts", async () => {
      await seedBaseDocs({ tutorVerified: true });
      const receiptRef = doc(studentDb(), "asaasWebhookReceipts", "payment_pay_1");

      await assertFails(
        setDoc(receiptRef, {
          paymentId: "pay_1",
          event: "PAYMENT_CONFIRMED",
          outcome: "confirmed",
          createdAt: new Date(),
        }),
      );
    });
  });
});
