export const ACTIVE_OCCUPANCY_STATUSES: Set<string>;
export const OCCUPANCY_POLL_INTERVAL_MS: number;
export const LESSON_DURATION_MS: number;

export function isActiveOccupancyStatus(status: unknown): boolean;

export function scheduledAtToIso(value: unknown): string;

export function slotOverlapsOccupiedStarts(
  scheduledAt: unknown,
  occupiedStarts: unknown,
): boolean;

export function occupiedStartsFromBookingData(
  bookings: Array<{ status?: unknown; scheduledAt?: unknown } & Record<string, unknown>>,
): string[];

export function occupancyResponse(occupiedStarts: unknown): { occupiedStarts: string[] };

export function parseOccupiedStarts(
  payload: ({ occupiedStarts?: unknown } & Record<string, unknown>) | null | undefined,
): Date[];

export function normalizeTutorId(value: unknown): string;

export function bookingsOccupancyQuery(
  db: { collection: (name: string) => unknown },
  tutorId: string,
): { get: () => Promise<{ docs: Array<{ data: () => Record<string, unknown> }> }> };

export function loadTutorOccupiedStarts(
  db: { collection: (name: string) => unknown },
  tutorId: string,
): Promise<string[]>;
