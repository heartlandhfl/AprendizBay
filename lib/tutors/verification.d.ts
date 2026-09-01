export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "suspended";

export type AdminReviewAction = "approve" | "reject" | "request_changes" | "suspend";

export type VerificationMessageTone = "info" | "success" | "warning" | "error";

export const VERIFICATION_STATUSES: readonly VerificationStatus[];
export const ADMIN_REVIEW_ACTIONS: readonly AdminReviewAction[];
export const TUTOR_RESUBMIT_FROM: readonly VerificationStatus[];
export const STATUS_LABELS: Record<VerificationStatus, string>;
export const ACTION_LABELS: Record<AdminReviewAction, string>;
export const ADMIN_TRANSITIONS: Record<AdminReviewAction, VerificationStatus[]>;

export function isVerificationStatus(value: unknown): value is VerificationStatus;
export function isAdminReviewAction(value: unknown): value is AdminReviewAction;
export function resolveVerificationStatus(data?: {
  isVerified?: boolean;
  verificationStatus?: string;
} | null): VerificationStatus;
export function isMarketplaceVisible(data?: {
  isVerified?: boolean;
  verificationStatus?: string;
} | null): boolean;
export function nextStatusForAction(action: AdminReviewAction): VerificationStatus;
export function canAdminTransition(
  fromStatus: VerificationStatus,
  action: AdminReviewAction,
): boolean;
export function canTutorResubmit(fromStatus: VerificationStatus): boolean;
export function actionRequiresReason(action: AdminReviewAction): boolean;

export function validateAdminReview(input: {
  currentStatus: VerificationStatus | string;
  action: string;
  reason?: string;
}): { nextStatus: VerificationStatus; reason: string | null };

export function validateTutorResubmit(currentStatus: VerificationStatus | string): {
  nextStatus: "pending";
};

export function buildVerificationWrite(input: {
  status: VerificationStatus;
  reviewedBy?: string;
  reason?: string | null;
  deleteSentinel: unknown;
  timestamp: unknown;
  clearReviewMeta?: boolean;
}): Record<string, unknown>;

export function tutorStatusMessage(
  status: VerificationStatus,
  reason?: string | null,
): {
  title: string;
  body: string;
  tone: VerificationMessageTone;
};

export function applyAdminVerificationReview(
  deps: {
    db: {
      collection: (name: string) => {
        doc: (id: string) => {
          get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
          update: (data: Record<string, unknown>) => Promise<unknown>;
        };
      };
    };
    FieldValue: { serverTimestamp: () => unknown; delete: () => unknown };
  },
  input: {
    tutorId: string;
    adminUid: string;
    action: string;
    reason?: string;
  },
): Promise<{
  tutorId: string;
  status: VerificationStatus;
  previousStatus: VerificationStatus;
}>;

export function applyTutorVerificationResubmit(
  deps: {
    db: {
      collection: (name: string) => {
        doc: (id: string) => {
          get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
          update: (data: Record<string, unknown>) => Promise<unknown>;
        };
      };
    };
    FieldValue: { serverTimestamp: () => unknown; delete: () => unknown };
  },
  input: { tutorId: string },
): Promise<{
  tutorId: string;
  status: "pending";
  previousStatus: VerificationStatus;
}>;
