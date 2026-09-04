import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-aprendiz-bay";
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

    for (const uid of [STUDENT_ID, TUTOR_ID, OTHER_TUTOR_ID, ADMIN_ID]) {
      const snapshot = await getDoc(doc(db, "users", uid));
      if (!snapshot.exists()) {
        throw new Error(`Falha ao gravar o usuário ${uid} no emulador.`);
      }
    }
  });
}

function storageFor(uid: string, email: string, token: Record<string, unknown> = {}) {
  return testEnv.authenticatedContext(uid, { email, ...token }).storage();
}

const PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xc3, 0xa4,
]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SVG_BYTES = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
);
const JS_BYTES = new TextEncoder().encode("alert(1)");
const HTML_BYTES = new TextEncoder().encode("<html><script>alert(1)</script></html>");

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
  const otherTutorPath = `tutors/${OTHER_TUTOR_ID}/credentials/documento.pdf`;

  async function seedCredential(objectPath = path) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), objectPath), PDF_BYTES, {
        contentType: "application/pdf",
      });
    });
  }

  it("lets the owner tutor upload their own verification document", async () => {
    await assertSucceeds(
      uploadBytes(ref(storageFor(TUTOR_ID, "mariana@test.com"), path), PDF_BYTES, {
        contentType: "application/pdf",
      }),
    );
  });

  it("lets the owner tutor upload JPEG and PNG verification documents", async () => {
    const tutor = storageFor(TUTOR_ID, "mariana@test.com");

    await assertSucceeds(
      uploadBytes(ref(tutor, `tutors/${TUTOR_ID}/credentials/documento.jpg`), JPEG_BYTES, {
        contentType: "image/jpeg",
      }),
    );
    await assertSucceeds(
      uploadBytes(ref(tutor, `tutors/${TUTOR_ID}/credentials/documento.png`), PNG_BYTES, {
        contentType: "image/png",
      }),
    );
  });

  it("lets the owner tutor replace their own verification document", async () => {
    const tutor = storageFor(TUTOR_ID, "mariana@test.com");

    await assertSucceeds(
      uploadBytes(ref(tutor, path), PDF_BYTES, { contentType: "application/pdf" }),
    );
    await assertSucceeds(
      uploadBytes(ref(tutor, path), PDF_BYTES, { contentType: "application/pdf" }),
    );
  });

  it("denies a tutor uploading to another tutor credentials folder", async () => {
    await assertFails(
      uploadBytes(ref(storageFor(OTHER_TUTOR_ID, "lucas@test.com"), path), PDF_BYTES, {
        contentType: "application/pdf",
      }),
    );
  });

  it("denies a tutor overwriting another tutor verification document", async () => {
    await seedCredential();

    await assertFails(
      uploadBytes(ref(storageFor(OTHER_TUTOR_ID, "lucas@test.com"), path), PDF_BYTES, {
        contentType: "application/pdf",
      }),
    );
    await assertFails(deleteObject(ref(storageFor(OTHER_TUTOR_ID, "lucas@test.com"), path)));
  });

  it("denies a student accessing a verification document", async () => {
    await seedCredential();

    await assertFails(getBytes(ref(storageFor(STUDENT_ID, "ana@test.com"), path)));
  });

  it("denies an anonymous user accessing a verification document", async () => {
    await seedCredential();

    await assertFails(getBytes(ref(testEnv.unauthenticatedContext().storage(), path)));
  });

  it("lets an admin access a verification document", async () => {
    await seedCredential();

    await assertSucceeds(getBytes(ref(storageFor(ADMIN_ID, "admin@test.com", { role: "admin" }), path)));
  });

  it("lets the owner tutor read their own verification document", async () => {
    await seedCredential();

    await assertSucceeds(getBytes(ref(storageFor(TUTOR_ID, "mariana@test.com"), path)));
  });

  it("denies a student uploading into a tutor credentials folder", async () => {
    await assertFails(
      uploadBytes(ref(storageFor(STUDENT_ID, "ana@test.com"), path), PDF_BYTES, {
        contentType: "application/pdf",
      }),
    );
  });

  it("denies another tutor reading a verification document", async () => {
    await seedCredential();

    await assertFails(getBytes(ref(storageFor(OTHER_TUTOR_ID, "lucas@test.com"), path)));
  });

  it("denies SVG, script, and HTML uploads as verification documents", async () => {
    const tutor = storageFor(TUTOR_ID, "mariana@test.com");

    await assertFails(
      uploadBytes(ref(tutor, `tutors/${TUTOR_ID}/credentials/documento.svg`), SVG_BYTES, {
        contentType: "image/svg+xml",
      }),
    );
    await assertFails(
      uploadBytes(ref(tutor, `tutors/${TUTOR_ID}/credentials/documento.js`), JS_BYTES, {
        contentType: "application/javascript",
      }),
    );
    await assertFails(
      uploadBytes(ref(tutor, `tutors/${TUTOR_ID}/credentials/documento.html`), HTML_BYTES, {
        contentType: "text/html",
      }),
    );
    await assertFails(
      uploadBytes(ref(tutor, `tutors/${TUTOR_ID}/credentials/documento.pdf`), JS_BYTES, {
        contentType: "application/javascript",
      }),
    );
  });

  it("denies WebP and GIF verification documents", async () => {
    const tutor = storageFor(TUTOR_ID, "mariana@test.com");

    await assertFails(
      uploadBytes(ref(tutor, `tutors/${TUTOR_ID}/credentials/documento.webp`), JPEG_BYTES, {
        contentType: "image/webp",
      }),
    );
    await assertFails(
      uploadBytes(ref(tutor, `tutors/${TUTOR_ID}/credentials/documento.gif`), JPEG_BYTES, {
        contentType: "image/gif",
      }),
    );
  });

  it("denies a verification document larger than 10 MB", async () => {
    const oversized = new Uint8Array(10 * 1024 * 1024 + 1);

    await assertFails(
      uploadBytes(ref(storageFor(TUTOR_ID, "mariana@test.com"), path), oversized, {
        contentType: "application/pdf",
      }),
    );
  });

  it("denies a content type that does not match the file extension", async () => {
    await assertFails(
      uploadBytes(
        ref(storageFor(TUTOR_ID, "mariana@test.com"), `tutors/${TUTOR_ID}/credentials/documento.pdf`),
        JPEG_BYTES,
        { contentType: "image/jpeg" },
      ),
    );
  });

  it("lets a tutor upload only to their own credentials path", async () => {
    await assertSucceeds(
      uploadBytes(
        ref(storageFor(OTHER_TUTOR_ID, "lucas@test.com"), otherTutorPath),
        PDF_BYTES,
        { contentType: "application/pdf" },
      ),
    );
    await assertFails(
      uploadBytes(ref(storageFor(OTHER_TUTOR_ID, "lucas@test.com"), path), PDF_BYTES, {
        contentType: "application/pdf",
      }),
    );
  });
});

describe("storage.rules administrative verification records", () => {
  const adminPath = `tutors/${TUTOR_ID}/verification/parecer.pdf`;

  async function seedAdminRecord() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), adminPath), PDF_BYTES, {
        contentType: "application/pdf",
      });
    });
  }

  it("lets an admin create, read, and replace an administrative verification record", async () => {
    const admin = storageFor(ADMIN_ID, "admin@test.com", { role: "admin" });

    await assertSucceeds(
      uploadBytes(ref(admin, adminPath), PDF_BYTES, { contentType: "application/pdf" }),
    );
    await assertSucceeds(getBytes(ref(admin, adminPath)));
    await assertSucceeds(
      uploadBytes(ref(admin, adminPath), PDF_BYTES, { contentType: "application/pdf" }),
    );
  });

  it("denies a tutor creating, reading, replacing, or deleting an administrative record", async () => {
    await seedAdminRecord();
    const tutor = storageFor(TUTOR_ID, "mariana@test.com");

    await assertFails(getBytes(ref(tutor, adminPath)));
    await assertFails(
      uploadBytes(ref(tutor, adminPath), PDF_BYTES, { contentType: "application/pdf" }),
    );
    await assertFails(deleteObject(ref(tutor, adminPath)));
  });

  it("denies students and anonymous users access to administrative records", async () => {
    await seedAdminRecord();

    await assertFails(getBytes(ref(storageFor(STUDENT_ID, "ana@test.com"), adminPath)));
    await assertFails(getBytes(ref(testEnv.unauthenticatedContext().storage(), adminPath)));
  });
});

describe("storage.rules profile photos", () => {
  const avatarPath = `users/${TUTOR_ID}/avatar.jpg`;

  it("lets the owner upload a profile photo and the public read it", async () => {
    await assertSucceeds(
      uploadBytes(ref(storageFor(TUTOR_ID, "mariana@test.com"), avatarPath), JPEG_BYTES, {
        contentType: "image/jpeg",
      }),
    );

    await assertSucceeds(getBytes(ref(testEnv.unauthenticatedContext().storage(), avatarPath)));
    await assertSucceeds(getBytes(ref(storageFor(STUDENT_ID, "ana@test.com"), avatarPath)));
  });

  it("denies SVG profile photo uploads", async () => {
    await assertFails(
      uploadBytes(ref(storageFor(TUTOR_ID, "mariana@test.com"), avatarPath), SVG_BYTES, {
        contentType: "image/svg+xml",
      }),
    );
  });

  it("denies uploading a non-avatar file into the user folder", async () => {
    await assertFails(
      uploadBytes(
        ref(storageFor(TUTOR_ID, "mariana@test.com"), `users/${TUTOR_ID}/malware.js`),
        JS_BYTES,
        { contentType: "application/javascript" },
      ),
    );
  });

  it("denies a user uploading a profile photo to another account", async () => {
    await assertFails(
      uploadBytes(ref(storageFor(OTHER_TUTOR_ID, "lucas@test.com"), avatarPath), JPEG_BYTES, {
        contentType: "image/jpeg",
      }),
    );
  });
});

describe("storage.rules collective hub materials", () => {
  const hubId = "hub-materials";
  const materialPath = `hubs/${hubId}/materials/slide.pdf`;

  async function seedHubWithParticipant() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "collectiveHubs", hubId), {
        tutorId: TUTOR_ID,
        title: "Turma de inglês",
        confirmedStudentCount: 1,
        maxStudents: 6,
        status: "open",
        currentPrice: 25,
      });
      await setDoc(doc(db, "collectiveHubs", hubId, "participants", STUDENT_ID), {
        studentId: STUDENT_ID,
        joinedAt: new Date(),
      });
      await uploadBytes(ref(context.storage(), materialPath), PDF_BYTES, {
        contentType: "application/pdf",
      });
    });
  }

  it("lets a joined student read hub materials via the participants subcollection", async () => {
    await seedHubWithParticipant();

    await assertSucceeds(getBytes(ref(storageFor(STUDENT_ID, "ana@test.com"), materialPath)));
  });

  it("lets enrolled students upload hub materials via the participants subcollection", async () => {
    await seedHubWithParticipant();
    const student = storageFor(STUDENT_ID, "ana@test.com");
    const uploadPath = `hubs/${hubId}/materials/notes.pdf`;

    await assertSucceeds(
      uploadBytes(ref(student, uploadPath), PDF_BYTES, { contentType: "application/pdf" }),
    );
  });

  it("denies a non-participant from reading hub materials", async () => {
    await seedHubWithParticipant();

    await assertFails(getBytes(ref(storageFor(OTHER_TUTOR_ID, "lucas@test.com"), materialPath)));
  });

  it("denies outsiders from uploading hub materials", async () => {
    await seedHubWithParticipant();
    const outsider = storageFor(OTHER_TUTOR_ID, "lucas@test.com");
    const uploadPath = `hubs/${hubId}/materials/notes.pdf`;

    await assertFails(
      uploadBytes(ref(outsider, uploadPath), PDF_BYTES, { contentType: "application/pdf" }),
    );
  });
});
