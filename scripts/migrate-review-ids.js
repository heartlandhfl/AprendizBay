"use strict";

/**
 * Move legacy reviews/{randomId} documents to reviews/{bookingId}.
 *
 * Safety:
 * - Never overwrites an existing reviews/{bookingId} document.
 * - Never deletes a leftover review if the canonical document already exists.
 * - When two legacy reviews share a booking, only the oldest is moved;
 *   extras are kept so nothing is accidentally deleted or duplicated.
 *
 * Usage:
 *   node scripts/migrate-review-ids.js           # dry-run
 *   node scripts/migrate-review-ids.js --apply   # write changes
 */

const { planReviewIdMigration } = require("../lib/reviews/create-review");

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
  };
}

function reviewFromSnapshot(docSnap) {
  const data = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    bookingId: data.bookingId,
    createdAt: data.createdAt,
    data,
  };
}

async function applyMoves(db, moves) {
  const { FieldValue } = require("firebase-admin/firestore");
  let moved = 0;

  for (const move of moves) {
    const sourceRef = db.collection("reviews").doc(move.sourceId);
    const destRef = db.collection("reviews").doc(move.destId);

    await db.runTransaction(async (tx) => {
      const [sourceSnap, destSnap] = await Promise.all([tx.get(sourceRef), tx.get(destRef)]);
      if (!sourceSnap.exists || destSnap.exists) {
        return;
      }

      const data = sourceSnap.data() ?? {};
      tx.create(destRef, {
        ...data,
        bookingId: move.bookingId,
        migratedFrom: move.sourceId,
        migratedAt: FieldValue.serverTimestamp(),
      });
      tx.delete(sourceRef);
      moved += 1;
    });
  }

  return moved;
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  const { getAdminFirestore } = require("../server/api/firebase-admin");
  const db = getAdminFirestore();
  const snapshot = await db.collection("reviews").get();
  const reviews = snapshot.docs.map(reviewFromSnapshot);
  const plan = planReviewIdMigration(reviews);

  console.log(
    JSON.stringify(
      {
        apply,
        scanned: reviews.length,
        moves: plan.moves,
        skippedExisting: plan.skippedExisting,
        leftovers: plan.leftovers,
        skippedInvalid: plan.skippedInvalid,
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("Dry-run only. Re-run with --apply to move reviews.");
    return;
  }

  const moved = await applyMoves(db, plan.moves);
  console.log(`Moved ${moved} review(s) to reviews/{bookingId}.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  applyMoves,
  parseArgs,
};
