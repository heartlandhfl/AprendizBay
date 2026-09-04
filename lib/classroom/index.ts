import { jitsiClassroomProvider } from "@/lib/classroom/jitsi-provider";
import type { BookingClassroomContext, ClassroomProvider } from "@/lib/classroom/types";

export type { BookingClassroomContext, ClassroomProvider } from "@/lib/classroom/types";
export { jitsiClassroomProvider } from "@/lib/classroom/jitsi-provider";

/** Production default until additional providers are implemented. */
export const defaultClassroomProvider: ClassroomProvider = jitsiClassroomProvider;

export function resolveClassroomJoinUrl(
  booking: BookingClassroomContext,
  provider: ClassroomProvider = defaultClassroomProvider,
): string {
  return provider.resolveJoinUrl(booking);
}
