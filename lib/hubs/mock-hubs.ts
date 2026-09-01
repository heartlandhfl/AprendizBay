import type { CollectiveHubLive } from "@/lib/hubs/types";
import { getTutorProfile } from "@/lib/tutor-profiles";

/** Development/test fixture hubs. Not imported by production bundles. */
export function loadMockOpenHubs(): CollectiveHubLive[] {
  return ["1", "2", "3", "4", "5"].flatMap((tutorId) => {
    const profile = getTutorProfile(tutorId);
    if (!profile) {
      return [];
    }

    return profile.collectiveHubs
      .filter((hub) => hub.confirmedStudents < hub.maxStudents)
      .map((hub) => ({
        ...hub,
        subject: hub.subject || profile.subject,
        tutorName: hub.tutorName || profile.name,
        individualPrice: hub.individualPrice || profile.individualPrice,
        tutorId: profile.id,
        status: "open",
        isJoined: false,
      }));
  });
}
