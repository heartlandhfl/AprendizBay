#!/usr/bin/env tsx
/**
 * Admin-only role management CLI (Firebase Admin SDK).
 *
 * Usage:
 *   npx tsx scripts/manage-role.ts get <uid>
 *   npx tsx scripts/manage-role.ts set <uid> <student|lecturer|admin|facilitator|support>
 *   npx tsx scripts/manage-role.ts remove <uid>
 *
 * The caller must already be trusted (shell with Admin credentials).
 * Never expose this script or credentials to the browser.
 */
import "dotenv/config";
import { CANONICAL_ROLES, type CanonicalRole } from "@/lib/auth/roles";
import { getRole, removeRole, setRole } from "@/lib/auth/role-server";

function usage() {
  console.error(`Usage:
  npx tsx scripts/manage-role.ts get <uid>
  npx tsx scripts/manage-role.ts set <uid> <${CANONICAL_ROLES.join("|")}>
  npx tsx scripts/manage-role.ts remove <uid>`);
  process.exit(1);
}

async function main() {
  const [, , command, uid, roleArg] = process.argv;

  if (!command || !uid) {
    usage();
  }

  switch (command) {
    case "get": {
      const role = await getRole(uid);
      console.log(JSON.stringify({ uid, role }, null, 2));
      return;
    }
    case "set": {
      if (!roleArg || !CANONICAL_ROLES.includes(roleArg as CanonicalRole)) {
        usage();
      }
      await setRole(uid, roleArg as CanonicalRole);
      const role = await getRole(uid);
      console.log(JSON.stringify({ ok: true, uid, role }, null, 2));
      return;
    }
    case "remove": {
      await removeRole(uid);
      const role = await getRole(uid);
      console.log(JSON.stringify({ ok: true, uid, role }, null, 2));
      return;
    }
    default:
      usage();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
