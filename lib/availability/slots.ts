import type { AvailabilitySlot, Weekday } from "@/lib/availability/types";

export const LESSON_DURATION_MINUTES = 60;
export const BOOKING_HORIZON_DAYS = 28;

export interface BookableSlot {
  startsAt: Date;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function startOfLocalDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

function isSlotOccupied(
  slotStart: Date,
  slotEnd: Date,
  occupiedStarts: Date[],
): boolean {
  return occupiedStarts.some((occupiedStart) => {
    const occupiedEnd = new Date(
      occupiedStart.getTime() + LESSON_DURATION_MINUTES * 60_000,
    );
    return overlaps(slotStart, slotEnd, occupiedStart, occupiedEnd);
  });
}

function generateDaySlots(
  day: Date,
  availabilitySlots: AvailabilitySlot[],
  occupiedStarts: Date[],
  now: Date,
): BookableSlot[] {
  const weekday = day.getDay() as Weekday;
  const dayAvailability = availabilitySlots.filter((slot) => slot.weekday === weekday);
  const bookable: BookableSlot[] = [];

  for (const availability of dayAvailability) {
    let cursor = timeToMinutes(availability.startTime);
    const end = timeToMinutes(availability.endTime);

    while (cursor + LESSON_DURATION_MINUTES <= end) {
      const slotStart = new Date(day);
      slotStart.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + LESSON_DURATION_MINUTES * 60_000);

      if (slotStart > now && !isSlotOccupied(slotStart, slotEnd, occupiedStarts)) {
        bookable.push({ startsAt: slotStart });
      }

      cursor += LESSON_DURATION_MINUTES;
    }
  }

  return bookable;
}

export function buildBookableSlots(
  availabilitySlots: AvailabilitySlot[],
  occupiedStarts: Date[],
  now: Date = new Date(),
): BookableSlot[] {
  if (availabilitySlots.length === 0) {
    return [];
  }

  const bookable: BookableSlot[] = [];
  const firstDay = startOfLocalDay(now);

  for (let offset = 0; offset < BOOKING_HORIZON_DAYS; offset += 1) {
    const day = new Date(firstDay);
    day.setDate(firstDay.getDate() + offset);
    bookable.push(...generateDaySlots(day, availabilitySlots, occupiedStarts, now));
  }

  return bookable.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function formatSlotDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatSlotTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function groupBookableSlotsByDay(
  slots: BookableSlot[],
): Array<{ dayKey: string; label: string; slots: BookableSlot[] }> {
  const grouped = new Map<string, { label: string; slots: BookableSlot[] }>();

  for (const slot of slots) {
    const dayKey = slot.startsAt.toISOString().slice(0, 10);
    const existing = grouped.get(dayKey);

    if (existing) {
      existing.slots.push(slot);
      continue;
    }

    grouped.set(dayKey, {
      label: formatSlotDate(slot.startsAt),
      slots: [slot],
    });
  }

  return Array.from(grouped.entries()).map(([dayKey, value]) => ({
    dayKey,
    label: value.label,
    slots: value.slots,
  }));
}

export function isSameSlot(left: Date | null, right: Date | null): boolean {
  if (!left || !right) {
    return false;
  }

  return left.getTime() === right.getTime();
}
