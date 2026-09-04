export function shouldReleaseHubSeat(booking: {
  type?: string;
  hubId?: string;
  studentId?: string;
}): boolean;

export function evaluateHubLeave(
  hub: Record<string, unknown> | null | undefined,
  studentId: string,
  extras?: { participantExists?: boolean },
): { ok: boolean; code?: string; nextCount?: number; nextStatus?: string; studentId?: string };

export function hubLeaveWrite(
  decision: { nextCount: number; nextStatus: string },
  timestamp: unknown,
): Record<string, unknown>;
