import type { Booking } from "@/lib/bookings/types";
import type { CollectiveHubLive } from "@/lib/hubs/types";

export interface ProfessorStudentPreview {
  studentId: string;
  displayName: string;
  lessonCount: number;
  subject: string;
  upcomingLessonLabel?: string;
  lastLessonLabel?: string;
}

const TEACHING_STATUSES = new Set(["confirmed", "completed"]);

function formatLessonLabel(booking: Booking): string | undefined {
  if (!booking.scheduledAt?.toDate) {
    return undefined;
  }

  return booking.scheduledAt.toDate().toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function resolveStudentSubject(
  booking: Booking,
  tutorSubject: string | undefined,
  hubsById: Record<string, CollectiveHubLive>,
): string {
  if (booking.type === "coletivo" && booking.hubId) {
    return hubsById[booking.hubId]?.subject || tutorSubject || "Turma coletiva";
  }

  return tutorSubject || "Aula";
}

export interface BuildProfessorStudentsPreviewOptions {
  tutorSubject?: string;
  hubs?: CollectiveHubLive[];
  now?: Date;
  limit?: number;
}

/**
 * Lightweight student preview from bookings the professor already owns.
 * Does not invent a students collection or extra identity fields.
 */
export function buildProfessorStudentsPreview(
  bookings: Booking[],
  studentNames: Record<string, string>,
  options: BuildProfessorStudentsPreviewOptions = {},
): ProfessorStudentPreview[] {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const limit = options.limit ?? 6;
  const hubsById = Object.fromEntries((options.hubs ?? []).map((hub) => [hub.id, hub]));
  const byStudent = new Map<
    string,
    {
      preview: ProfessorStudentPreview;
      upcomingMs: number | null;
      lastMs: number | null;
    }
  >();

  for (const booking of bookings) {
    if (!TEACHING_STATUSES.has(booking.status)) {
      continue;
    }

    const scheduledMs = booking.scheduledAt?.toMillis?.() ?? 0;
    const subject = resolveStudentSubject(booking, options.tutorSubject, hubsById);
    const existing = byStudent.get(booking.studentId);

    if (!existing) {
      byStudent.set(booking.studentId, {
        preview: {
          studentId: booking.studentId,
          displayName: studentNames[booking.studentId] || "Aluno",
          lessonCount: 1,
          subject,
        },
        upcomingMs: null,
        lastMs: null,
      });
    } else {
      existing.preview.lessonCount += 1;
      if (!existing.preview.subject && subject) {
        existing.preview.subject = subject;
      }
    }

    const entry = byStudent.get(booking.studentId);
    if (!entry) {
      continue;
    }

    if (booking.status === "confirmed" && scheduledMs >= nowMs) {
      if (entry.upcomingMs === null || scheduledMs < entry.upcomingMs) {
        entry.upcomingMs = scheduledMs;
        entry.preview.upcomingLessonLabel = formatLessonLabel(booking);
      }
    }

    if (booking.status === "completed" || scheduledMs < nowMs) {
      if (entry.lastMs === null || scheduledMs > entry.lastMs) {
        entry.lastMs = scheduledMs;
        entry.preview.lastLessonLabel = formatLessonLabel(booking);
      }
    }
  }

  return [...byStudent.values()]
    .map(({ preview }) => preview)
    .sort((left, right) => right.lessonCount - left.lessonCount)
    .slice(0, limit);
}

export function countActiveStudents(bookings: Booking[]): number {
  const ids = new Set<string>();
  for (const booking of bookings) {
    if (TEACHING_STATUSES.has(booking.status)) {
      ids.add(booking.studentId);
    }
  }
  return ids.size;
}
