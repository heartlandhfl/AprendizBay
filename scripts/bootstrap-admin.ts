#!/usr/bin/env tsx
/**
 * Bootstrap the first admin user from ADMIN_EMAIL.
 *
 * Usage:
 *   ADMIN_EMAIL=admin-test@aprendizbay.test npx tsx scripts/bootstrap-admin.ts
 *
 * Idempotent: safe to run multiple times.
 * Server-only — never expose Firebase Admin credentials to the browser.
 */
import "dotenv/config";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/admin";
import { getRole, setRole } from "@/lib/auth/role-server";

async function main() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!email) {
    console.error("ADMIN_EMAIL is required.");
    process.exit(1);
  }

  const auth = getAuth(getAdminApp());
  const user = await auth.getUserByEmail(email);
  const existingRole = await getRole(user.uid);

  await setRole(user.uid, "admin", {
    email: user.email ?? email,
    displayName: user.displayName ?? "Administrador",
  });

  const finalRole = await getRole(user.uid);
  console.log(
    JSON.stringify(
      {
        ok: true,
        uid: user.uid,
        email: user.email ?? email,
        previousRole: existingRole,
        role: finalRole,
        idempotent: existingRole === "admin",
        nextStep:
          "Sign out and sign in again (or refresh the session) so middleware and APIs receive the admin custom claim.",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
