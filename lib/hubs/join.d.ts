export const HUB_STATUSES: {
  open: "open";
  full: "full";
  closed: "closed";
  cancelled: "cancelled";
};

export type HubStatus = (typeof HUB_STATUSES)[keyof typeof HUB_STATUSES];

export const HUB_JOIN_ERRORS: {
  not_found: string;
  already_joined: string;
  full: string;
  closed: string;
  cancelled: string;
  unauthorized: string;
};

export type HubJoinErrorCode = keyof typeof HUB_JOIN_ERRORS;

export interface HubJoinSnapshot {
  confirmedStudentIds?: string[];
  confirmedStudentCount?: number;
  maxStudents?: number;
  status?: string;
}

export interface HubJoinSuccess {
  ok: true;
  nextIds: string[];
  nextCount: number;
  nextStatus: HubStatus;
}

export interface HubJoinFailure {
  ok: false;
  code: HubJoinErrorCode;
  message: string;
}

export type HubJoinDecision = HubJoinSuccess | HubJoinFailure;

export function createHubJoinError(code: HubJoinErrorCode, message?: string): Error & {
  code: HubJoinErrorCode;
};

export function normalizeStudentIds(ids: unknown): string[];

export function resolvedConfirmedCount(hub?: HubJoinSnapshot | null): number;

export function hubAcceptsNewStudents(hub?: HubJoinSnapshot | null): boolean;

export function evaluateHubJoin(
  hub: HubJoinSnapshot | null | undefined,
  studentId: string,
): HubJoinDecision;

export function applyHubJoin<T extends HubJoinSnapshot>(
  hub: T,
  studentId: string,
): T & {
  confirmedStudentIds: string[];
  confirmedStudentCount: number;
  status: HubStatus;
};

export function simulateConcurrentJoins(
  hub: HubJoinSnapshot,
  studentIds: string[],
): {
  hub: HubJoinSnapshot & {
    confirmedStudentIds: string[];
    confirmedStudentCount: number;
    status?: string;
  };
  results: Array<HubJoinDecision & { studentId: string }>;
};

export function hubJoinWrite(
  decision: HubJoinSuccess,
  timestamp: unknown,
): {
  confirmedStudentIds: string[];
  confirmedStudentCount: number;
  status: HubStatus;
  updatedAt: unknown;
};
