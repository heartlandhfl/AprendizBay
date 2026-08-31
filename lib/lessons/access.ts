export function canAccessLesson(
  booking: { studentId?: unknown; tutorId?: unknown } | null | undefined,
  uid: string | null | undefined,
): boolean {
  if (!booking || typeof uid !== "string" || !uid.trim()) {
    return false;
  }

  return booking.studentId === uid || booking.tutorId === uid;
}

export const LESSON_ACCESS_DENIED_MESSAGE =
  "Esta aula não existe ou você não tem permissão para vê-la.";
