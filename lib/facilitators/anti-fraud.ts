import type { Firestore } from "firebase-admin/firestore";
import {
  FACILITATOR_REFERRAL_FLAGS_COLLECTION,
  type FacilitatorRecord,
} from "@/lib/facilitators/schema";
import { collectIdentityKeys } from "@/lib/facilitators/identity";

export const REFERRAL_FRAUD_ERRORS = {
  selfReferral: "Não é possível usar seu próprio link de indicação.",
  flaggedIdentity: "Esta indicação não pôde ser registrada por motivos de segurança.",
  facilitatorInactive: "Este link de indicação não está ativo.",
} as const;

export type ReferralFraudReason =
  | "self_referral"
  | "flagged_identity"
  | "facilitator_inactive";

export interface ReferralFraudCheckInput {
  facilitator: FacilitatorRecord;
  userEmail: string;
  userPhone?: string;
  userCpf?: string;
}

export interface ReferralFraudCheckResult {
  allowed: boolean;
  reason?: ReferralFraudReason;
  message?: string;
  identityKeys: string[];
}

export function evaluateReferralFraud(input: ReferralFraudCheckInput): ReferralFraudCheckResult {
  if (input.facilitator.status !== "active") {
    return {
      allowed: false,
      reason: "facilitator_inactive",
      message: REFERRAL_FRAUD_ERRORS.facilitatorInactive,
      identityKeys: [],
    };
  }

  const identityKeys = collectIdentityKeys({
    email: input.userEmail,
    phone: input.userPhone,
    cpf: input.userCpf,
  });

  const facilitatorKeys = collectIdentityKeys({
    email: input.facilitator.email,
    phone: input.facilitator.phone,
    cpf: input.facilitator.cpf,
  });

  for (const key of identityKeys) {
    if (facilitatorKeys.includes(key)) {
      return {
        allowed: false,
        reason: "self_referral",
        message: REFERRAL_FRAUD_ERRORS.selfReferral,
        identityKeys,
      };
    }
  }

  return { allowed: true, identityKeys };
}

export async function hasFlaggedIdentityForFacilitator(
  db: Firestore,
  facilitatorId: string,
  identityKeys: string[],
): Promise<boolean> {
  if (identityKeys.length === 0) {
    return false;
  }

  const checks = await Promise.all(
    identityKeys.map((identityKey) =>
      db
        .collection(FACILITATOR_REFERRAL_FLAGS_COLLECTION)
        .doc(`${facilitatorId}_${identityKey}`)
        .get(),
    ),
  );

  return checks.some((snapshot) => snapshot.exists);
}

export async function flagIdentitiesForFacilitator(
  db: Firestore,
  facilitatorId: string,
  identityKeys: string[],
  reason: string,
): Promise<void> {
  const batch = db.batch();
  for (const identityKey of identityKeys) {
    const ref = db
      .collection(FACILITATOR_REFERRAL_FLAGS_COLLECTION)
      .doc(`${facilitatorId}_${identityKey}`);
    batch.set(
      ref,
      {
        facilitatorId,
        identityKey,
        reason,
        createdAt: new Date(),
      },
      { merge: true },
    );
  }
  await batch.commit();
}
