"use client";

import { ExternalLink, Video } from "lucide-react";
import { parseSafeMeetingUrl } from "@/lib/bookings/meeting";
import {
  JOIN_LESSON_ARIA_LABEL,
  JOIN_LESSON_BUTTON_LABEL,
  JOIN_LESSON_EXTERNAL_HINT,
} from "@/lib/lessons/copy";

interface JoinLessonButtonProps {
  meetingUrl?: string | null;
  missingMessage: string;
}

export default function JoinLessonButton({
  meetingUrl,
  missingMessage,
}: JoinLessonButtonProps) {
  const safeUrl = parseSafeMeetingUrl(meetingUrl);

  if (!safeUrl) {
    return (
      <p
        className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200"
        role="status"
      >
        {missingMessage}
      </p>
    );
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={JOIN_LESSON_ARIA_LABEL}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 sm:w-auto"
    >
      <Video className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        {JOIN_LESSON_BUTTON_LABEL}{" "}
        <span className="font-medium text-white/90">({JOIN_LESSON_EXTERNAL_HINT})</span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
    </a>
  );
}
