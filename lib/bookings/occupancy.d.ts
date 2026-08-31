export const ACTIVE_OCCUPANCY_STATUSES: Set<string>;
export const OCCUPANCY_POLL_INTERVAL_MS: number;

export function isActiveOccupancyStatus(status: unknown): boolean;

export function occupiedStartsFromBookingData(
  bookings: Array<{ status?: unknown; scheduledAt?: unknown }>,
): string[];

export function occupancyResponse(occupiedStarts: unknown): { occupiedStarts: string[] };

export function parseOccupiedStarts(payload: { occupiedStarts?: unknown } | null | undefined): Date[];

export function normalizeTutorId(value: unknown): string;

export function loadTutorOccupiedStarts(
  db: {
    collection: (name: string) => {
      where: (...args: unknown[]) => {
        where: (...args: unknown[]) => {
          select?: (...fields: string[]) => { get: () => Promise<{ docs: Array<{ data: () => Record<string, unknown> }> }> };
          get: () => Promise<{ docs: Array<{ data: () => Record<string, unknown> }> }>;
        };
      };
    };
  },
  tutorId: string,
): Promise<string[]>;
