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
  deleteDoc,
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
const NEW_STUDENT_ID = "student-new";
const NEW_TUTOR_ID = "tutor-new";

let testEnv: RulesTestEnvironment;

function emulatorTarget() {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const separator = raw.lastIndexOf(":");

  return {
    host: raw.slice(0, separator).replace(/^\[|\]$/g, "") || "127.0.0.1",
    port: Number(raw.slice(separator + 1) || 8080),
  };
}

async function seedBaseDocs(options: {
  tutorVerified: boolean;
  verificationStatus?: "pending" | "approved" | "rejected" | "changes_requested" | "suspended";
}) {
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
      verificationStatus:
        options.verificationStatus ?? (options.tutorVerified ? "approved" : "pending"),
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
      verificationStatus:
        options.verificationStatus ?? (options.tutorVerified ? "approved" : "pending"),
      rating: 4.5,
      reviewCount: 4,
      createdAt: new Date(),
    });
  });
}

async function seedBooking(
  bookingId: string,
  status: "pending" | "confirmed" | "completed" | "cancelled",
  extras: {
    studentId?: string;
    tutorId?: string;
    paymentStatus?: "unpaid" | "awaiting_payment" | "paid";
    scheduledAt?: Date;
  } = {},
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "bookings", bookingId), {
      studentId: extras.studentId ?? STUDENT_ID,
      tutorId: extras.tutorId ?? TUTOR_ID,
      type: "individual",
      status,
      paymentStatus: extras.paymentStatus ?? "paid",
      price: 70,
      studentName: "Nome privado",
      paymentId: "pay_secret",
      notes: "Observação privada",
      scheduledAt: extras.scheduledAt ?? new Date("2026-09-01T19:00:00Z"),
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

function newStudentDb() {
  return testEnv.authenticatedContext(NEW_STUDENT_ID, { email: "nova@test.com" }).firestore();
}

function newTutorDb() {
  return testEnv.authenticatedContext(NEW_TUTOR_ID, { email: "pedro@test.com" }).firestore();
}

function guestDb() {
  return testEnv.unauthenticatedContext().firestore();
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

function userSignupPayload(role: "student" | "tutor", email: string, extras: Record<string, unknown> = {}) {
  return {
    role,
    displayName: "Novo usuário",
    email,
    createdAt: new Date(),
    ...extras,
  };
}

function tutorOnboardingPayload(tutorId: string, extras: Record<string, unknown> = {}) {
  return {
    userId: tutorId,
    name: "Pedro Santos",
    subject: "Inglês",
    city: "São Paulo",
    state: "SP",
    bio: "Professor de inglês com foco em conversação.",
    individualPrice: 70,
    collectivePrice: 25,
    modality: "online",
    isVerified: false,
    verificationStatus: "pending",
    isOnline: false,
    rating: 0,
    reviewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extras,
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
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });

      await assertSucceeds(
        addDoc(collection(studentDb(), "bookings"), pendingBookingPayload()),
      );
    });

    it("denies booking a suspended tutor even if isVerified is stale", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "suspended" });

      await assertFails(addDoc(collection(studentDb(), "bookings"), pendingBookingPayload()));
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

    it("lets a student cancel an unpaid booking from the client", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "bookings", "unpaid-1"), {
          ...pendingBookingPayload(),
          createdAt: new Date("2026-08-20T19:00:00Z"),
        });
      });

      await assertSucceeds(
        updateDoc(doc(studentDb(), "bookings", "unpaid-1"), { status: "cancelled" }),
      );
    });

    it("blocks a student from cancelling a paid booking from the client", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await seedBooking("paid-1", "confirmed");

      await assertFails(
        updateDoc(doc(studentDb(), "bookings", "paid-1"), { status: "cancelled" }),
      );
    });

    it("blocks a tutor from cancelling another tutor's booking", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "users", "tutor-2"), {
          role: "tutor",
          displayName: "Outro",
          email: "outro@test.com",
          createdAt: new Date(),
        });
        await setDoc(doc(context.firestore(), "bookings", "other-tutor"), {
          ...pendingBookingPayload(),
          tutorId: TUTOR_ID,
          createdAt: new Date("2026-08-20T19:00:00Z"),
        });
      });

      const otherTutor = testEnv
        .authenticatedContext("tutor-2", { email: "outro@test.com" })
        .firestore();
      await assertFails(
        updateDoc(doc(otherTutor, "bookings", "other-tutor"), {
          status: "cancelled",
          updatedAt: new Date(),
        }),
      );
    });

    describe("lesson completion", () => {
      const pastSchedule = new Date("2026-08-30T19:00:00Z");

      function completePayload() {
        return {
          status: "completed" as const,
          completedAt: new Date(),
          updatedAt: new Date(),
        };
      }

      it("allows the booking tutor to complete a confirmed paid lesson after the schedule", async () => {
        await seedBaseDocs({ tutorVerified: true });
        await seedBooking("booking-done", "confirmed", { scheduledAt: pastSchedule });

        await assertSucceeds(
          updateDoc(doc(tutorDb(), "bookings", "booking-done"), completePayload()),
        );
      });

      it("denies pending → completed", async () => {
        await seedBaseDocs({ tutorVerified: true });
        await seedBooking("booking-pending", "pending", { scheduledAt: pastSchedule });

        await assertFails(
          updateDoc(doc(tutorDb(), "bookings", "booking-pending"), completePayload()),
        );
      });

      it("denies cancelled → completed", async () => {
        await seedBaseDocs({ tutorVerified: true });
        await seedBooking("booking-cancelled", "cancelled", { scheduledAt: pastSchedule });

        await assertFails(
          updateDoc(doc(tutorDb(), "bookings", "booking-cancelled"), completePayload()),
        );
      });

      it("denies unpaid → completed", async () => {
        await seedBaseDocs({ tutorVerified: true });
        await seedBooking("booking-unpaid", "confirmed", {
          scheduledAt: pastSchedule,
          paymentStatus: "unpaid",
        });

        await assertFails(
          updateDoc(doc(tutorDb(), "bookings", "booking-unpaid"), completePayload()),
        );
      });

      it("denies a student completing their own booking", async () => {
        await seedBaseDocs({ tutorVerified: true });
        await seedBooking("booking-done", "confirmed", { scheduledAt: pastSchedule });

        await assertFails(
          updateDoc(doc(studentDb(), "bookings", "booking-done"), completePayload()),
        );
      });

      it("denies another tutor completing the lesson", async () => {
        await seedBaseDocs({ tutorVerified: true });
        await seedBooking("booking-done", "confirmed", { scheduledAt: pastSchedule });

        await assertFails(
          updateDoc(doc(tutorBDb(), "bookings", "booking-done"), completePayload()),
        );
      });

      it("denies an unauthenticated completion", async () => {
        await seedBaseDocs({ tutorVerified: true });
        await seedBooking("booking-done", "confirmed", { scheduledAt: pastSchedule });

        await assertFails(
          updateDoc(doc(guestDb(), "bookings", "booking-done"), completePayload()),
        );
      });
    });
  });

  describe("reviews", () => {
    it("allows a student to review a completed booking with the booking id", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await seedBooking("booking-done", "completed");

      await assertSucceeds(
        setDoc(doc(studentDb(), "reviews", "booking-done"), reviewPayload("booking-done")),
      );
    });

    it("denies a second review document for the same booking", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await seedBooking("booking-done", "completed");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), "reviews", "booking-done"),
          reviewPayload("booking-done"),
        );
      });

      await assertFails(
        addDoc(collection(studentDb(), "reviews"), reviewPayload("booking-done")),
      );
      await assertFails(
        setDoc(doc(studentDb(), "reviews", "other-id"), reviewPayload("booking-done")),
      );
    });

    it("denies a student review when the booking is pending", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await seedBooking("booking-pending", "pending");

      await assertFails(
        setDoc(
          doc(studentDb(), "reviews", "booking-pending"),
          reviewPayload("booking-pending"),
        ),
      );
    });

    it("denies a student review when the booking is cancelled", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await seedBooking("booking-cancelled", "cancelled");

      await assertFails(
        setDoc(
          doc(studentDb(), "reviews", "booking-cancelled"),
          reviewPayload("booking-cancelled"),
        ),
      );
    });

    it("denies a review for another student's booking", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await seedBooking("booking-done", "completed", { studentId: STUDENT_B_ID });

      await assertFails(
        setDoc(doc(studentDb(), "reviews", "booking-done"), reviewPayload("booking-done")),
      );
    });

    it("denies a review for another tutor", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await seedBooking("booking-done", "completed");

      await assertFails(
        setDoc(doc(studentDb(), "reviews", "booking-done"), {
          ...reviewPayload("booking-done"),
          tutorId: TUTOR_B_ID,
        }),
      );
    });

    it("denies an invalid rating", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await seedBooking("booking-done", "completed");

      await assertFails(
        setDoc(doc(studentDb(), "reviews", "booking-done"), {
          ...reviewPayload("booking-done"),
          rating: 0,
        }),
      );
      await assertFails(
        setDoc(doc(studentDb(), "reviews", "booking-done"), {
          ...reviewPayload("booking-done"),
          rating: 6,
        }),
      );
    });

    it("denies an unauthenticated review request", async () => {
      await seedBaseDocs({ tutorVerified: true });
      await seedBooking("booking-done", "completed");

      await assertFails(
        setDoc(doc(guestDb(), "reviews", "booking-done"), reviewPayload("booking-done")),
      );
    });
  });

  describe("users", () => {
    it("allows a student to create their own account", async () => {
      await assertSucceeds(
        setDoc(
          doc(newStudentDb(), "users", NEW_STUDENT_ID),
          userSignupPayload("student", "nova@test.com", { photoUrl: "https://example.com/a.jpg" }),
        ),
      );
    });

    it("allows a tutor to create their own account", async () => {
      await assertSucceeds(
        setDoc(
          doc(newTutorDb(), "users", NEW_TUTOR_ID),
          userSignupPayload("tutor", "pedro@test.com"),
        ),
      );
    });

    it("denies creating an admin account", async () => {
      await assertFails(
        setDoc(doc(newStudentDb(), "users", NEW_STUDENT_ID), {
          ...userSignupPayload("student", "nova@test.com"),
          role: "admin",
        }),
      );
    });

    it("denies creating a user document for another uid", async () => {
      await assertFails(
        setDoc(
          doc(newStudentDb(), "users", STUDENT_ID),
          userSignupPayload("student", "nova@test.com"),
        ),
      );
    });

    it("denies creating a user document with a different email than the auth token", async () => {
      await assertFails(
        setDoc(
          doc(newStudentDb(), "users", NEW_STUDENT_ID),
          userSignupPayload("student", "outra@test.com"),
        ),
      );
    });

    it("denies creating a user document with extra security fields", async () => {
      await assertFails(
        setDoc(doc(newStudentDb(), "users", NEW_STUDENT_ID), {
          ...userSignupPayload("student", "nova@test.com"),
          isAdmin: true,
          permissions: ["all"],
        }),
      );
    });

    it("allows the owner to update displayName and photoUrl", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertSucceeds(
        updateDoc(doc(studentDb(), "users", STUDENT_ID), {
          displayName: "Ana Souza Atualizada",
          photoUrl: "https://example.com/ana.jpg",
          updatedAt: new Date(),
        }),
      );
    });

    it("denies the owner changing their role or becoming admin", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(updateDoc(doc(studentDb(), "users", STUDENT_ID), { role: "tutor" }));
      await assertFails(updateDoc(doc(studentDb(), "users", STUDENT_ID), { role: "admin" }));
    });

    it("denies the owner changing their email", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(
        updateDoc(doc(studentDb(), "users", STUDENT_ID), { email: "hack@test.com" }),
      );
    });

    it("denies a student updating another user's profile", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(
        updateDoc(doc(studentDb(), "users", STUDENT_B_ID), { displayName: "Nome invadido" }),
      );
      await assertFails(
        updateDoc(doc(studentDb(), "users", TUTOR_ID), { displayName: "Nome invadido" }),
      );
    });

    it("denies listing every user document", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(getDocs(collection(studentDb(), "users")));
      await assertFails(getDocs(collection(tutorDb(), "users")));
    });

    it("allows an authenticated user to read a counterpart profile by id", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertSucceeds(getDoc(doc(studentDb(), "users", STUDENT_ID)));
      await assertSucceeds(getDoc(doc(tutorDb(), "users", STUDENT_ID)));
    });

    it("denies unauthenticated reads of user documents", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(getDoc(doc(guestDb(), "users", STUDENT_ID)));
    });

    it("allows an admin to change a user's role and to list users", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertSucceeds(updateDoc(doc(adminDb(), "users", STUDENT_ID), { role: "tutor" }));
      await assertSucceeds(getDocs(collection(adminDb(), "users")));
    });

    it("denies a student deleting their user document", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(deleteDoc(doc(studentDb(), "users", STUDENT_ID)));
    });

    it("allows an admin to delete a user document", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertSucceeds(deleteDoc(doc(adminDb(), "users", STUDENT_B_ID)));
    });
  });

  describe("tutors", () => {
    async function seedNewTutorUser() {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "users", NEW_TUTOR_ID), {
          role: "tutor",
          displayName: "Pedro Santos",
          email: "pedro@test.com",
          createdAt: new Date(),
        });
      });
    }

    it("allows a tutor to create their onboarding profile unverified", async () => {
      await seedNewTutorUser();

      await assertSucceeds(
        setDoc(doc(newTutorDb(), "tutors", NEW_TUTOR_ID), tutorOnboardingPayload(NEW_TUTOR_ID)),
      );
    });

    it("lets guests list only verified tutors", async () => {
      await seedBaseDocs({ tutorVerified: true });

      await assertSucceeds(
        getDocs(query(collection(guestDb(), "tutors"), where("isVerified", "==", true))),
      );
      await assertFails(getDocs(collection(guestDb(), "tutors")));
    });

    it("hides unverified tutor profiles from students and guests", async () => {
      await seedBaseDocs({ tutorVerified: false, verificationStatus: "pending" });

      await assertFails(getDoc(doc(studentDb(), "tutors", TUTOR_ID)));
      await assertFails(getDoc(doc(guestDb(), "tutors", TUTOR_ID)));
      await assertSucceeds(getDoc(doc(tutorDb(), "tutors", TUTOR_ID)));
    });

    it("lets students read a verified public tutor profile", async () => {
      await seedBaseDocs({ tutorVerified: true });

      await assertSucceeds(getDoc(doc(studentDb(), "tutors", TUTOR_ID)));
      await assertSucceeds(getDoc(doc(guestDb(), "tutors", TUTOR_ID)));
    });

    it("denies a student creating a tutor profile", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(
        setDoc(doc(studentDb(), "tutors", STUDENT_ID), tutorOnboardingPayload(STUDENT_ID)),
      );
    });

    it("denies creating a verified tutor profile", async () => {
      await seedNewTutorUser();

      await assertFails(
        setDoc(
          doc(newTutorDb(), "tutors", NEW_TUTOR_ID),
          tutorOnboardingPayload(NEW_TUTOR_ID, { isVerified: true }),
        ),
      );
    });

    it("denies creating a tutor profile with a non-zero rating", async () => {
      await seedNewTutorUser();

      await assertFails(
        setDoc(
          doc(newTutorDb(), "tutors", NEW_TUTOR_ID),
          tutorOnboardingPayload(NEW_TUTOR_ID, { rating: 5, reviewCount: 10 }),
        ),
      );
    });

    it("denies creating a tutor profile for another uid", async () => {
      await seedNewTutorUser();

      await assertFails(
        setDoc(doc(newTutorDb(), "tutors", TUTOR_ID), tutorOnboardingPayload(TUTOR_ID)),
      );
    });

    it("denies a tutor changing their own isVerified flag", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(
        updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { isVerified: true }),
      );
    });

    it("denies a tutor changing verificationStatus, reviewedBy or reason", async () => {
      await seedBaseDocs({ tutorVerified: false, verificationStatus: "pending" });

      await assertFails(
        updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { verificationStatus: "approved" }),
      );
      await assertFails(
        updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { reviewedBy: TUTOR_ID }),
      );
      await assertFails(
        updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), {
          verificationReason: "Eu mesmo aprovei.",
        }),
      );
    });

    it("still lets a tutor update their public profile fields", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertSucceeds(
        updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), {
          bio: "Professora de inglês com foco em conversação.",
          individualPrice: 80,
          isOnline: true,
          hasAvailability: true,
          updatedAt: new Date(),
        }),
      );
    });

    it("denies a tutor changing userId, rating, or reviewCount", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(
        updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { userId: STUDENT_ID }),
      );
      await assertFails(updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { rating: 5 }));
      await assertFails(updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { reviewCount: 99 }));
    });

    it("denies a tutor changing hoursTaught, studentsServed, or administrative status", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { hoursTaught: 9999 }));
      await assertFails(updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { studentsServed: 9999 }));
      await assertFails(updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { isSuspended: true }));
      await assertFails(
        updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { moderationStatus: "rejected" }),
      );
      await assertFails(updateDoc(doc(tutorDb(), "tutors", TUTOR_ID), { status: "suspended" }));
    });

    it("denies a tutor updating another tutor's profile", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(
        updateDoc(doc(tutorDb(), "tutors", TUTOR_B_ID), { bio: "Perfil invadido" }),
      );
    });

    it("allows an admin to approve, reject, request changes and suspend", async () => {
      await seedBaseDocs({ tutorVerified: false, verificationStatus: "pending" });

      await assertSucceeds(
        updateDoc(doc(adminDb(), "tutors", TUTOR_ID), {
          verificationStatus: "approved",
          isVerified: true,
          reviewedBy: ADMIN_ID,
          reviewedAt: new Date(),
        }),
      );

      await assertSucceeds(
        updateDoc(doc(adminDb(), "tutors", TUTOR_ID), {
          verificationStatus: "rejected",
          isVerified: false,
          verificationReason: "Documento ilegível.",
          reviewedBy: ADMIN_ID,
        }),
      );

      await assertSucceeds(
        updateDoc(doc(adminDb(), "tutors", TUTOR_ID), {
          verificationStatus: "changes_requested",
          isVerified: false,
          verificationReason: "Envie o diploma.",
          reviewedBy: ADMIN_ID,
        }),
      );

      await assertSucceeds(
        updateDoc(doc(adminDb(), "tutors", TUTOR_ID), {
          verificationStatus: "suspended",
          isVerified: false,
          verificationReason: "Denúncia confirmada.",
          reviewedBy: ADMIN_ID,
        }),
      );
    });

    it("denies a student writing verification fields", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(
        updateDoc(doc(studentDb(), "tutors", TUTOR_ID), { verificationStatus: "approved" }),
      );
    });

    it("lets a tutor create a pending profile but not a self-approved one", async () => {
      await seedBaseDocs({ tutorVerified: false });
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await deleteDoc(doc(context.firestore(), "tutors", TUTOR_ID));
      });

      const payload = {
        userId: TUTOR_ID,
        name: "Mariana Silva",
        subject: "Inglês",
        individualPrice: 70,
        collectivePrice: 25,
        isVerified: false,
        verificationStatus: "pending",
        createdAt: new Date(),
      };

      await assertSucceeds(setDoc(doc(tutorDb(), "tutors", TUTOR_ID), payload));

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await deleteDoc(doc(context.firestore(), "tutors", TUTOR_ID));
      });

      await assertFails(
        setDoc(doc(tutorDb(), "tutors", TUTOR_ID), {
          ...payload,
          isVerified: true,
          verificationStatus: "approved",
        }),
      );
    });

    it("allows an admin to write verification and moderation fields", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertSucceeds(
        updateDoc(doc(adminDb(), "tutors", TUTOR_ID), { isVerified: false }),
      );
      await assertSucceeds(
        updateDoc(doc(adminDb(), "tutors", TUTOR_ID), {
          isSuspended: true,
          moderationStatus: "suspended",
        }),
      );
    });

    it("allows an admin to update rating and reviewCount", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertSucceeds(
        updateDoc(doc(adminDb(), "tutors", TUTOR_ID), { rating: 4.8, reviewCount: 11 }),
      );
    });

    it("denies a tutor deleting their profile", async () => {
      await seedBaseDocs({ tutorVerified: false });

      await assertFails(deleteDoc(doc(tutorDb(), "tutors", TUTOR_ID)));
    });
  });

  describe("collectiveHubs", () => {
    function hubPayload(extras: Record<string, unknown> = {}) {
      return {
        tutorId: TUTOR_ID,
        title: "Inglês para Viagem",
        description: "Frases essenciais para aeroporto e hotel.",
        maxStudents: 2,
        confirmedStudentIds: [],
        confirmedStudentCount: 0,
        currentPrice: 25,
        fullPrice: 18,
        schedule: "Terças, 19h · Online",
        modality: "online",
        status: "open",
        subject: "Inglês",
        tutorName: "Mariana Silva",
        scheduledDate: "2026-09-08",
        startTime: "19:00",
        individualPrice: 70,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...extras,
      };
    }

    async function seedHub(hubId: string, extras: Record<string, unknown> = {}) {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "collectiveHubs", hubId), hubPayload(extras));
      });
    }

    function joinWrite(
      beforeIds: string[],
      studentId: string,
      maxStudents = 2,
    ) {
      const nextIds = [...beforeIds, studentId];
      return {
        confirmedStudentIds: nextIds,
        confirmedStudentCount: nextIds.length,
        status: nextIds.length >= maxStudents ? "full" : "open",
        updatedAt: new Date(),
      };
    }

    it("lets an approved tutor create a public collective class", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });

      await assertSucceeds(addDoc(collection(tutorDb(), "collectiveHubs"), hubPayload()));
    });

    it("denies an unverified tutor from offering a public class", async () => {
      await seedBaseDocs({ tutorVerified: false, verificationStatus: "pending" });

      await assertFails(addDoc(collection(tutorDb(), "collectiveHubs"), hubPayload()));
    });

    it("lets the first student join an open class", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });
      await seedHub("hub-first");

      await assertSucceeds(
        updateDoc(doc(studentDb(), "collectiveHubs", "hub-first"), joinWrite([], STUDENT_ID, 6)),
      );
    });

    it("lets a student take the final vacancy and marks the class full", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });
      await seedHub("hub-last", {
        confirmedStudentIds: [STUDENT_ID],
        confirmedStudentCount: 1,
        maxStudents: 2,
      });

      await assertSucceeds(
        updateDoc(
          doc(studentBDb(), "collectiveHubs", "hub-last"),
          joinWrite([STUDENT_ID], STUDENT_B_ID, 2),
        ),
      );
    });

    it("rejects the second student when two try to take the last seat", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });
      await seedHub("hub-race", {
        confirmedStudentIds: [STUDENT_ID],
        confirmedStudentCount: 1,
        maxStudents: 2,
      });

      await assertSucceeds(
        updateDoc(
          doc(studentBDb(), "collectiveHubs", "hub-race"),
          joinWrite([STUDENT_ID], STUDENT_B_ID, 2),
        ),
      );

      const lateStudent = testEnv
        .authenticatedContext(NEW_STUDENT_ID, { email: "nova@test.com" })
        .firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "users", NEW_STUDENT_ID), {
          role: "student",
          displayName: "Nova",
          email: "nova@test.com",
          createdAt: new Date(),
        });
      });

      await assertFails(
        updateDoc(
          doc(lateStudent, "collectiveHubs", "hub-race"),
          joinWrite([STUDENT_ID], NEW_STUDENT_ID, 2),
        ),
      );
    });

    it("rejects a join when the class is already full", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });
      await seedHub("hub-full", {
        status: "full",
        confirmedStudentIds: [STUDENT_ID, STUDENT_B_ID],
        confirmedStudentCount: 2,
      });

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), "users", NEW_STUDENT_ID), {
          role: "student",
          displayName: "Nova",
          email: "nova@test.com",
          createdAt: new Date(),
        });
      });

      const lateStudent = testEnv
        .authenticatedContext(NEW_STUDENT_ID, { email: "nova@test.com" })
        .firestore();
      await assertFails(
        updateDoc(
          doc(lateStudent, "collectiveHubs", "hub-full"),
          joinWrite([STUDENT_ID, STUDENT_B_ID], NEW_STUDENT_ID, 2),
        ),
      );
    });

    it("rejects a join when the class is cancelled", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });
      await seedHub("hub-cancelled", { status: "cancelled" });

      await assertFails(
        updateDoc(doc(studentDb(), "collectiveHubs", "hub-cancelled"), joinWrite([], STUDENT_ID, 2)),
      );
    });

    it("rejects a join when the class is closed", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });
      await seedHub("hub-closed", { status: "closed" });

      await assertFails(
        updateDoc(doc(studentDb(), "collectiveHubs", "hub-closed"), joinWrite([], STUDENT_ID, 2)),
      );
    });

    it("denies a student adding or removing another student", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });
      await seedHub("hub-other", {
        confirmedStudentIds: [],
        confirmedStudentCount: 0,
        maxStudents: 6,
      });

      await assertFails(
        updateDoc(doc(studentDb(), "collectiveHubs", "hub-other"), {
          confirmedStudentIds: [STUDENT_B_ID],
          confirmedStudentCount: 1,
          status: "open",
          updatedAt: new Date(),
        }),
      );

      await seedHub("hub-remove", {
        confirmedStudentIds: [STUDENT_ID, STUDENT_B_ID],
        confirmedStudentCount: 2,
        maxStudents: 6,
      });

      await assertFails(
        updateDoc(doc(studentDb(), "collectiveHubs", "hub-remove"), {
          confirmedStudentIds: [STUDENT_ID],
          confirmedStudentCount: 1,
          updatedAt: new Date(),
        }),
      );
    });

    it("lets the owner tutor update their hub and blocks the other tutor", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });
      await seedHub("hub-owned");

      await assertSucceeds(
        updateDoc(doc(tutorDb(), "collectiveHubs", "hub-owned"), {
          title: "Inglês para Viagem — Turma da noite",
          updatedAt: new Date(),
        }),
      );

      await assertFails(
        updateDoc(doc(tutorBDb(), "collectiveHubs", "hub-owned"), {
          title: "Turma invadida",
          updatedAt: new Date(),
        }),
      );

      await assertFails(
        updateDoc(doc(tutorBDb(), "collectiveHubs", "hub-owned"), {
          status: "cancelled",
          updatedAt: new Date(),
        }),
      );
    });

    it("denies the owner tutor from rewriting another student's seat", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });
      await seedHub("hub-roster", {
        confirmedStudentIds: [STUDENT_ID],
        confirmedStudentCount: 1,
      });

      await assertFails(
        updateDoc(doc(tutorDb(), "collectiveHubs", "hub-roster"), {
          confirmedStudentIds: [STUDENT_B_ID],
          confirmedStudentCount: 1,
          updatedAt: new Date(),
        }),
      );
    });

    it("denies transferring hub ownership", async () => {
      await seedBaseDocs({ tutorVerified: true, verificationStatus: "approved" });
      await seedHub("hub-transfer");

      await assertFails(
        updateDoc(doc(tutorDb(), "collectiveHubs", "hub-transfer"), {
          tutorId: TUTOR_B_ID,
          updatedAt: new Date(),
        }),
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
