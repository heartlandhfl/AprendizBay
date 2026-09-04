/** Minimal booking fields needed to resolve or create a classroom join URL. */
export interface BookingClassroomContext {
  id: string;
  meetingUrl?: string | null;
}

/**
 * Pluggable classroom backend (Jitsi today; Pencil Spaces or others later).
 * Booking → ClassroomProvider → concrete provider (e.g. JitsiProvider).
 */
export interface ClassroomProvider {
  readonly providerId: string;
  createJoinUrl(bookingId: string): string;
  resolveJoinUrl(booking: BookingClassroomContext): string;
}
