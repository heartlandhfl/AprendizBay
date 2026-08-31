import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db, requireFirebaseApp, whenFirebaseReady } from "@/lib/firebase/client";
import { AVAILABILITY_DOC_ID, WEEKDAY_LABELS } from "@/lib/availability/constants";
import type { AvailabilitySlot, TutorAvailability } from "@/lib/availability/types";
import type { FirestoreAvailabilityDoc } from "@/lib/tutors/firestore-types";
import { setTutorHasAvailability } from "@/lib/tutors/service";

const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function availabilityRef(tutorId: string) {
  return doc(db, "tutors", tutorId, "availability", AVAILABILITY_DOC_ID);
}

function parseSlot(value: unknown): AvailabilitySlot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const slot = value as Partial<AvailabilitySlot>;
  if (
    typeof slot.weekday !== "number" ||
    slot.weekday < 0 ||
    slot.weekday > 6 ||
    typeof slot.startTime !== "string" ||
    typeof slot.endTime !== "string" ||
    !TIME_PATTERN.test(slot.startTime) ||
    !TIME_PATTERN.test(slot.endTime)
  ) {
    return null;
  }

  return {
    weekday: slot.weekday as AvailabilitySlot["weekday"],
    startTime: slot.startTime,
    endTime: slot.endTime,
  };
}

function mapAvailabilityDoc(data: FirestoreAvailabilityDoc | undefined): TutorAvailability {
  const slots = (data?.slots ?? [])
    .map(parseSlot)
    .filter((slot): slot is AvailabilitySlot => slot !== null)
    .sort((a, b) =>
      a.weekday === b.weekday
        ? a.startTime.localeCompare(b.startTime, "pt-BR")
        : a.weekday - b.weekday,
    );

  return { slots };
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function validateAvailabilitySlots(slots: AvailabilitySlot[]): string | null {
  if (slots.length > 42) {
    return "Você pode cadastrar no máximo 42 horários por semana.";
  }

  const byWeekday = new Map<number, AvailabilitySlot[]>();

  for (const slot of slots) {
    if (!TIME_PATTERN.test(slot.startTime) || !TIME_PATTERN.test(slot.endTime)) {
      return "Use horários válidos no formato HH:MM.";
    }

    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);

    if (start >= end) {
      return `O horário de término deve ser depois do início (${WEEKDAY_LABELS[slot.weekday]}).`;
    }

    const daySlots = byWeekday.get(slot.weekday) ?? [];
    for (const existing of daySlots) {
      const existingStart = timeToMinutes(existing.startTime);
      const existingEnd = timeToMinutes(existing.endTime);

      if (start < existingEnd && end > existingStart) {
        return `Há horários sobrepostos em ${WEEKDAY_LABELS[slot.weekday]}.`;
      }
    }

    daySlots.push(slot);
    byWeekday.set(slot.weekday, daySlots);
  }

  return null;
}

export function subscribeToTutorAvailability(
  tutorId: string,
  onChange: (availability: TutorAvailability) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return whenFirebaseReady(
    () =>
      onSnapshot(
        availabilityRef(tutorId),
        (snapshot) => {
          onChange(mapAvailabilityDoc(snapshot.data() as FirestoreAvailabilityDoc | undefined));
        },
        (error) => onError?.(error),
      ),
    () => onChange({ slots: [] }),
  );
}

export async function saveTutorAvailability(
  tutorId: string,
  slots: AvailabilitySlot[],
): Promise<void> {
  const validationError = validateAvailabilitySlots(slots);
  if (validationError) {
    throw new Error(validationError);
  }

  await requireFirebaseApp();
  await setDoc(
    availabilityRef(tutorId),
    {
      slots: slots.map((slot) => ({
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await setTutorHasAvailability(tutorId, slots.length > 0);
}

export function formatAvailabilitySummary(slots: AvailabilitySlot[]): string {
  if (slots.length === 0) {
    return "Nenhum horário cadastrado";
  }

  const grouped = new Map<number, AvailabilitySlot[]>();
  for (const slot of slots) {
    const daySlots = grouped.get(slot.weekday) ?? [];
    daySlots.push(slot);
    grouped.set(slot.weekday, daySlots);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left - right)
    .map(([weekday, daySlots]) => {
      const ranges = daySlots
        .sort((a, b) => a.startTime.localeCompare(b.startTime, "pt-BR"))
        .map((slot) => `${slot.startTime}–${slot.endTime}`)
        .join(", ");

      return `${WEEKDAY_LABELS[weekday as AvailabilitySlot["weekday"]]}: ${ranges}`;
    })
    .join(" · ");
}
