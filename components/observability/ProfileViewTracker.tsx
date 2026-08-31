"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

interface ProfileViewTrackerProps {
  tutorId: string;
  subject: string;
}

export default function ProfileViewTracker({
  tutorId,
  subject,
}: ProfileViewTrackerProps) {
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.profileView, {
      tutor_id: tutorId,
      subject,
    });
  }, [subject, tutorId]);

  return null;
}
