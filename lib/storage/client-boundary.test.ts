import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CLIENT_SOURCES = [
  "lib/firebase/client.ts",
  "lib/storage/service.ts",
  "lib/storage/paths.ts",
  "lib/storage/validation.ts",
  "lib/storage/constants.ts",
  "components/uploads/AvatarUpload.tsx",
  "components/uploads/CredentialUpload.tsx",
  "components/tutors/TutorOnboardingWizard.tsx",
];

describe("browser storage boundary", () => {
  it("never references Firebase Admin credentials in client upload code", () => {
    for (const relativePath of CLIENT_SOURCES) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      expect(source, relativePath).not.toMatch(/FIREBASE_ADMIN_/);
      expect(source, relativePath).not.toMatch(/FIREBASE_SERVICE_ACCOUNT/);
      expect(source, relativePath).not.toMatch(/firebase-admin/);
      expect(source, relativePath).not.toMatch(/private_key|privateKey/);
    }
  });
});
