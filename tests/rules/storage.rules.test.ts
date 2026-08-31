import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-aprendiz-bay-storage";
const STUDENT_ID = "student-1";
const TUTOR_ID = "tutor-1";
const OTHER_TUTOR_ID = "tutor-2";
const ADMIN_ID = "admin-1";

let testEnv: RulesTestEnvironment;

function emulatorHost(raw: string, fallbackPort: number) {
  const separator = raw.lastIndexOf(":");
  return {
    host: raw.slice(0, separator).replace(/^\[|\]$/g, "") || "127.0.0.1",
    port: Number(raw.slice(separator + 1) || fallbackPort),
  };
}

async function seedUsers() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", STUDENT_ID), {
      role: "student",
      displayName: "Ana Souza",
      email: "ana@test.com",
    });
    await setDoc(doc(db, "users", TUTOR_ID), {
      role: "tutor",
      displayName: "Mariana Silva",
      email: "mariana@test.com",
    });
    await setDoc(doc(db, "users", OTHER_TUTOR_ID), {
      role: "tutor",
      displayName: "Lucas Ferreira",
      email: "lucas@test.com",
    });
    await setDoc(doc(db, "users", ADMIN_ID), {
      role: "admin",
      displayName: "Admin",
      email: "admin@test.com",
    });
  });
}

function storageFor(uid: string, email: string) {
  return testEnv.authenticatedContext(uid, { email }).storage();
}

const PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xc3, 0xa4,
]);

beforeAll(async () => {
  const firestore = emulatorHost(process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080", 8080);
  const storage = emulatorHost(process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? "127.0.0.1:9199", 9199);

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      host: firestore.host,
      port: firestore.port,
    },
    storage: {
      rules: readFileSync(resolve(process.cwd(), "storage.rules"), "utf8"),
      host: storage.host,
      port: storage.port,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
  await seedUsers();
});

describe("storage.rules credentials", () => {
  const path = `tutors/${TUTOR_ID}/credentials/documento.pdf`;

  async function seedCredential() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), path), PDF_BYTES, {
        contentType: "application/pdf",
      });
    });
  }

  it("lets the owner tutor upload a verification document", async () => {
    await assertSucceeds(
      uploadBytes(ref(storageFor(TUTOR_ID, "mariana@test.com"), path), PDF_BYTES, {
        contentType: "application/pdf",
      }),
    );
  });

  it("lets the owner tutor and an admin read the document", async () => {
    await seedCredential();

    await assertSucceeds(getBytes(ref(storageFor(TUTOR_ID, "mariana@test.com"), path)));
    await assertSucceeds(getBytes(ref(storageFor(ADMIN_ID, "admin@test.com"), path)));
  });

  it("denies public, student and other-tutor reads", async () => {
    await seedCredential();

    await assertFails(getBytes(ref(testEnv.unauthenticatedContext().storage(), path)));
    await assertFails(getBytes(ref(storageFor(STUDENT_ID, "ana@test.com"), path)));
    await assertFails(getBytes(ref(storageFor(OTHER_TUTOR_ID, "lucas@test.com"), path)));
  });

  it("denies a student uploading into another tutor credentials folder", async () => {
    await assertFails(
      uploadBytes(ref(storageFor(STUDENT_ID, "ana@test.com"), path), PDF_BYTES, {
        contentType: "application/pdf",
      }),
    );
  });
});
