/**
 * Hostinger audit — firebase-admin (Next.js server modules)
 *
 * Used by app/api/account/delete/route.ts on Vercel / next start.
 * Production Hostinger does not execute this module. Express serves the same
 * delete via POST /api/account/delete (server/api/account.js).
 *
 * Do not import this file from server.js.
 */
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { deleteUserAccount } from "@/lib/account/anonymize";
import { getAdminApp } from "@/lib/firebase/admin";

export async function deleteAuthenticatedAccount(uid: string) {
  const app = getAdminApp();
  const db = getFirestore(app);

  async function deleteStoragePrefixes(prefixes: string[]) {
    const bucket = getStorage(app).bucket();
    await Promise.all(prefixes.map((prefix) => bucket.deleteFiles({ prefix })));
  }

  return deleteUserAccount(
    {
      db,
      FieldValue,
      deleteAuthUser: (targetUid) => getAuth(app).deleteUser(targetUid),
      deleteStoragePrefixes,
    },
    uid,
  );
}
