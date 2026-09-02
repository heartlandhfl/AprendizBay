import { FieldValue, type Firestore } from "firebase-admin/firestore";
import {
  evaluateReferralFraud,
  flagIdentitiesForFacilitator,
  hasFlaggedIdentityForFacilitator,
  REFERRAL_FRAUD_ERRORS,
} from "@/lib/facilitators/anti-fraud";
import {
  FACILITATORS_COLLECTION,
  REFERRALS_COLLECTION,
  type FacilitatorRecord,
  type ReferralRecord,
  normalizeReferralCode,
} from "@/lib/facilitators/schema";

export const ATTACH_REFERRAL_ERRORS = {
  invalidCode: "Código de indicação inválido.",
  alreadyAttributed: "Esta conta já possui uma indicação registrada.",
  facilitatorNotFound: "Facilitador não encontrado para este código.",
} as const;

export interface AttachReferralInput {
  userId: string;
  userEmail: string;
  referralCode: string;
  userPhone?: string;
  userCpf?: string;
  source?: ReferralRecord["source"];
}

export interface AttachReferralResult {
  ok: boolean;
  status: ReferralRecord["status"] | "skipped";
  referralId?: string;
  facilitatorId?: string;
  reason?: string;
}

function mapFacilitatorRecord(docId: string, data: Record<string, unknown>): FacilitatorRecord {
  const stats = (data.stats ?? {}) as Record<string, unknown>;
  return {
    facilitatorId: docId,
    userId: String(data.userId ?? docId),
    referralCode: String(data.referralCode ?? ""),
    displayName: String(data.displayName ?? "Facilitador"),
    email: String(data.email ?? ""),
    phone: typeof data.phone === "string" ? data.phone : undefined,
    cpf: typeof data.cpf === "string" ? data.cpf : undefined,
    commissionRatePercent:
      typeof data.commissionRatePercent === "number" ? data.commissionRatePercent : 15,
    status: data.status === "suspended" ? "suspended" : "active",
    stats: {
      clicks: typeof stats.clicks === "number" ? stats.clicks : 0,
      signups: typeof stats.signups === "number" ? stats.signups : 0,
      activeUsers: typeof stats.activeUsers === "number" ? stats.activeUsers : 0,
      paidBookings: typeof stats.paidBookings === "number" ? stats.paidBookings : 0,
    },
  };
}

async function findFacilitatorByCode(
  db: Firestore,
  referralCode: string,
): Promise<FacilitatorRecord | null> {
  const normalized = normalizeReferralCode(referralCode);
  if (!normalized) {
    return null;
  }

  const snapshot = await db
    .collection(FACILITATORS_COLLECTION)
    .where("referralCode", "==", normalized)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0]!;
  return mapFacilitatorRecord(doc.id, doc.data());
}

export async function attachReferralToUser(
  db: Firestore,
  input: AttachReferralInput,
): Promise<AttachReferralResult> {
  const referralCode = normalizeReferralCode(input.referralCode);
  if (!referralCode) {
    return { ok: false, status: "rejected", reason: ATTACH_REFERRAL_ERRORS.invalidCode };
  }

  const existing = await db.collection(REFERRALS_COLLECTION).doc(input.userId).get();
  if (existing.exists) {
    return { ok: false, status: "skipped", reason: ATTACH_REFERRAL_ERRORS.alreadyAttributed };
  }

  const facilitator = await findFacilitatorByCode(db, referralCode);
  if (!facilitator) {
    return { ok: false, status: "rejected", reason: ATTACH_REFERRAL_ERRORS.facilitatorNotFound };
  }

  const fraudCheck = evaluateReferralFraud({
    facilitator,
    userEmail: input.userEmail,
    userPhone: input.userPhone,
    userCpf: input.userCpf,
  });

  if (!fraudCheck.allowed) {
    await db.collection(REFERRALS_COLLECTION).doc(input.userId).set({
      referralId: input.userId,
      facilitatorId: facilitator.facilitatorId,
      referralCode,
      userId: input.userId,
      userEmail: input.userEmail,
      userPhone: input.userPhone ?? null,
      userCpf: input.userCpf ?? null,
      status: "rejected",
      rejectionReason: fraudCheck.reason,
      source: input.source ?? "signup",
      attributedAt: FieldValue.serverTimestamp(),
    });
    return {
      ok: false,
      status: "rejected",
      reason: fraudCheck.message,
      referralId: input.userId,
      facilitatorId: facilitator.facilitatorId,
    };
  }

  const flagged = await hasFlaggedIdentityForFacilitator(
    db,
    facilitator.facilitatorId,
    fraudCheck.identityKeys,
  );
  if (flagged) {
    await db.collection(REFERRALS_COLLECTION).doc(input.userId).set({
      referralId: input.userId,
      facilitatorId: facilitator.facilitatorId,
      referralCode,
      userId: input.userId,
      userEmail: input.userEmail,
      userPhone: input.userPhone ?? null,
      userCpf: input.userCpf ?? null,
      status: "flagged",
      rejectionReason: "flagged_identity",
      source: input.source ?? "signup",
      attributedAt: FieldValue.serverTimestamp(),
    });
    return {
      ok: false,
      status: "flagged",
      reason: REFERRAL_FRAUD_ERRORS.flaggedIdentity,
      referralId: input.userId,
      facilitatorId: facilitator.facilitatorId,
    };
  }

  await db.runTransaction(async (transaction) => {
    const referralRef = db.collection(REFERRALS_COLLECTION).doc(input.userId);
    const facilitatorRef = db.collection(FACILITATORS_COLLECTION).doc(facilitator.facilitatorId);

    transaction.set(referralRef, {
      referralId: input.userId,
      facilitatorId: facilitator.facilitatorId,
      referralCode,
      userId: input.userId,
      userEmail: input.userEmail,
      userPhone: input.userPhone ?? null,
      userCpf: input.userCpf ?? null,
      status: "active",
      source: input.source ?? "signup",
      attributedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(facilitatorRef, {
      "stats.signups": FieldValue.increment(1),
      "stats.activeUsers": FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await flagIdentitiesForFacilitator(
    db,
    facilitator.facilitatorId,
    fraudCheck.identityKeys,
    "referral_signup",
  );

  return {
    ok: true,
    status: "active",
    referralId: input.userId,
    facilitatorId: facilitator.facilitatorId,
  };
}

export async function trackFacilitatorReferralClick(
  db: Firestore,
  referralCode: string,
): Promise<{ ok: boolean; facilitatorId?: string }> {
  const facilitator = await findFacilitatorByCode(db, referralCode);
  if (!facilitator || facilitator.status !== "active") {
    return { ok: false };
  }

  await db.collection(FACILITATORS_COLLECTION).doc(facilitator.facilitatorId).update({
    "stats.clicks": FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, facilitatorId: facilitator.facilitatorId };
}

export { findFacilitatorByCode, mapFacilitatorRecord };
