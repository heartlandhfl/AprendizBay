export const FACILITATORS_COLLECTION = "facilitators";
export const REFERRALS_COLLECTION = "referrals";
export const COMMISSIONS_COLLECTION = "commissions";
export const FACILITATOR_PAYOUTS_COLLECTION = "facilitatorPayouts";
export const FACILITATOR_REFERRAL_FLAGS_COLLECTION = "facilitatorReferralFlags";

export type FacilitatorStatus = "active" | "suspended";
export type ReferralStatus = "active" | "rejected" | "flagged";
export type CommissionStatus =
  | "pending"
  | "locked"
  | "approved"
  | "available"
  | "paid"
  | "reversed";

export type FacilitatorPayoutStatus = "pending" | "approved" | "paid" | "cancelled";

export interface FacilitatorStats {
  clicks: number;
  signups: number;
  activeUsers: number;
  paidBookings: number;
}

export interface FacilitatorRecord {
  facilitatorId: string;
  userId: string;
  referralCode: string;
  displayName: string;
  email: string;
  phone?: string;
  cpf?: string;
  commissionRatePercent: number;
  status: FacilitatorStatus;
  stats: FacilitatorStats;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReferralRecord {
  referralId: string;
  facilitatorId: string;
  referralCode: string;
  userId: string;
  userEmail: string;
  userPhone?: string;
  userCpf?: string;
  status: ReferralStatus;
  rejectionReason?: string;
  attributedAt?: unknown;
  source: "link" | "signup";
}

export interface CommissionRecord {
  commissionId: string;
  facilitatorId: string;
  referralId: string;
  studentId: string;
  bookingId: string;
  paymentId: string;
  grossAmount: number;
  platformFee: number;
  commissionAmount: number;
  status: CommissionStatus;
  payoutId?: string;
  refundWindowEndsAt?: unknown;
  lockedAt?: unknown;
  approvedAt?: unknown;
  availableAt?: unknown;
  paidAt?: unknown;
  reversedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FacilitatorPayoutRecord {
  payoutId: string;
  facilitatorId: string;
  commissionIds: string[];
  amount: number;
  status: FacilitatorPayoutStatus;
  createdAt?: unknown;
  approvedAt?: unknown;
  paidAt?: unknown;
}

export function buildCommissionDocId(bookingId: string): string {
  return `booking_${bookingId}`;
}

export function buildFacilitatorPayoutDocId(facilitatorId: string, payoutId: string): string {
  return `${facilitatorId}_${payoutId}`;
}

export function normalizeReferralCode(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}
