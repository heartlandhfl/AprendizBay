import type { Weekday } from "@/lib/availability/types";

const WEEKDAY_ALIASES: Record<string, Weekday> = {
  domingo: 0,
  dom: 0,
  segunda: 1,
  seg: 1,
  terca: 2,
  terça: 2,
  ter: 2,
  quarta: 3,
  qua: 3,
  quinta: 4,
  qui: 4,
  sexta: 5,
  sex: 5,
  sabado: 6,
  sábado: 6,
  sab: 6,
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseWeekday(schedule: string): Weekday | null {
  const normalized = normalizeText(schedule);

  for (const [alias, weekday] of Object.entries(WEEKDAY_ALIASES)) {
    if (normalized.includes(normalizeText(alias))) {
      return weekday;
    }
  }

  return null;
}

function parseTime(schedule: string): { hours: number; minutes: number } | null {
  const match = schedule.match(/(\d{1,2})(?::(\d{2}))?\s*h\b/i);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

function startOfTomorrowAt(hours: number, minutes: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function resolveHubScheduledAt(schedule: string, from: Date = new Date()): Date {
  const weekday = parseWeekday(schedule);
  const time = parseTime(schedule);

  if (weekday === null || time === null) {
    return startOfTomorrowAt(10, 0);
  }

  const candidate = new Date(from);
  candidate.setHours(time.hours, time.minutes, 0, 0);

  const daysUntil = (weekday - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + daysUntil);

  if (candidate <= from) {
    candidate.setDate(candidate.getDate() + 7);
  }

  return candidate;
}

export function resolveCollectiveClassScheduledAt(
  hub: {
    schedule: string;
    scheduledDate?: string;
    startTime?: string;
  },
  from: Date = new Date(),
): Date {
  if (hub.scheduledDate && hub.startTime) {
    const candidate = new Date(`${hub.scheduledDate}T${hub.startTime}:00`);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate;
    }
  }

  return resolveHubScheduledAt(hub.schedule, from);
}
