export interface PublicCollectiveHub {
  id: string;
  title: string;
  description: string;
  confirmedStudents: number;
  maxStudents: number;
  currentPrice: number;
  fullPrice: number;
  schedule: string;
  modality: "online" | "presencial";
  subject: string;
  tutorName: string;
  scheduledDate: string;
  startTime: string;
  individualPrice: number;
  status: string;
  tutorId: string;
  isJoined: boolean;
}

export function formatVacancyLabel(confirmedStudents: number, maxStudents: number): string;

export function collectiveSavingsPercent(
  individualPrice: number,
  collectivePrice: number,
): number;

export function formatHubScheduleDisplay(hub?: {
  schedule?: string;
  scheduledDate?: string;
  startTime?: string;
} | null): string;

export function toPublicCollectiveHub(
  id: string,
  data?: object | null,
  viewerId?: string,
  extras?: { isJoined?: boolean },
): PublicCollectiveHub;

export function publicHubOmitsStudentIds(hub: object | null | undefined): boolean;

export function buildHubSchedule(input: {
  scheduledDate?: string;
  startTime?: string;
  modality?: "online" | "presencial";
}): string;
