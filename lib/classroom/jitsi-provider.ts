import { generateMeetingUrl } from "@/lib/bookings/meeting-server";
import type { BookingClassroomContext, ClassroomProvider } from "@/lib/classroom/types";

/** Canonical Jitsi classroom provider for paid bookings. */
export const jitsiClassroomProvider: ClassroomProvider = {
  providerId: "jitsi",

  createJoinUrl(bookingId: string): string {
    return generateMeetingUrl(bookingId);
  },

  resolveJoinUrl(booking: BookingClassroomContext): string {
    const existing =
      typeof booking.meetingUrl === "string" ? booking.meetingUrl.trim() : "";
    return existing || this.createJoinUrl(booking.id);
  },
};
