#!/usr/bin/env tsx
/**
 * One-time migration: set Firebase Auth custom claims from existing users/{uid}.role.
 *
 * Usage:
 *   npx tsx scripts/migrate-role-claims.ts [--dry-run]
 *
 * Preserves existing student and professor (tutor) data. Maps profile tutor → lecturer claim.
 */
import "dotenv/config";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";
import { getRole, setRole } from "@/lib/auth/role-server";
import { normalizeRole } from "@/lib/auth/roles";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = getFirestore(getAdminApp());
  const auth = getAuth(getAdminApp());
  const snapshot = await db.collection("users").get();

  const summary = {
    dryRun,
    scanned: snapshot.size,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const doc of snapshot.docs) {
    const profileRole = typeof doc.data().role === "string" ? doc.data().role : null;
    const canonical = normalizeRole(profileRole);

    if (!canonical || canonical === "student") {
      summary.skipped += 1;
      continue;
    }

    try {
      const existing = await getRole(doc.id);
      if (existing === canonical) {
        summary.skipped += 1;
        continue;
      }

      if (!dryRun) {
        const user = await auth.getUser(doc.id).catch(() => null);
        await setRole(doc.id, canonical, {
          email: typeof doc.data().email === "string" ? doc.data().email : user?.email,
          displayName:
            typeof doc.data().displayName === "string"
              ? doc.data().displayName
              : user?.displayName ?? undefined,
        });
      }

      summary.updated += 1;
    } catch (error) {
      summary.errors.push(
        `${doc.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(JSON.stringify(summary, null, 2));

  if (summary.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
