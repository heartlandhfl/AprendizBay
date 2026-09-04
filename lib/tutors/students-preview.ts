import type { Booking } from "@/lib/bookings/types";

export interface ProfessorStudentPreview {
  studentId: string;
  displayName: string;
  lessonCount: number;
}

const TEACHING_STATUSES = new Set(["confirmed", "completed"]);

/**
 * Lightweight student preview from bookings the professor already owns.
 * Does not invent a students collection or extra identity fields.
 */
export function buildProfessorStudentsPreview(
  bookings: Booking[],
  studentNames: Record<string, string>,
  limit = 6,
): ProfessorStudentPreview[] {
  const byStudent = new Map<string, ProfessorStudentPreview>();

  for (const booking of bookings) {
    if (!TEACHING_STATUSES.has(booking.status)) {
      continue;
    }

    const existing = byStudent.get(booking.studentId);
    if (existing) {
      existing.lessonCount += 1;
      continue;
    }

    byStudent.set(booking.studentId, {
      studentId: booking.studentId,
      displayName: studentNames[booking.studentId] || "Aluno",
      lessonCount: 1,
    });
  }

  return [...byStudent.values()]
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
