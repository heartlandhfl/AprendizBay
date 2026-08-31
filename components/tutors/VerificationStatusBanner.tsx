"use client";

import Link from "next/link";
import { AlertCircle, BadgeCheck, Clock, ShieldAlert } from "lucide-react";
import { useTutorProfile } from "@/lib/tutors/useTutorProfile";
import {
  canTutorResubmit,
  resolveVerificationStatus,
  tutorStatusMessage,
} from "@/lib/tutors/verification";

const TONE_CLASS = {
  info: "border-sky-200 bg-sky-50 ring-sky-200/60 text-sky-950",
  success: "border-primary-200 bg-primary-50 ring-primary-200/60 text-primary-950",
  warning: "border-amber-200 bg-amber-50 ring-amber-200/60 text-amber-950",
  error: "border-red-200 bg-red-50 ring-red-200/60 text-red-950",
};

const TONE_ICON = {
  info: Clock,
  success: BadgeCheck,
  warning: AlertCircle,
  error: ShieldAlert,
};

export default function VerificationStatusBanner() {
  const { tutorDoc, loading, isProfileComplete } = useTutorProfile();

  if (loading || !isProfileComplete || !tutorDoc) {
    return null;
  }

  const status = resolveVerificationStatus(tutorDoc);
  const message = tutorStatusMessage(status, tutorDoc.verificationReason);
  const Icon = TONE_ICON[message.tone];

  return (
    <section
      className={`rounded-3xl border p-6 shadow-soft ring-1 ${TONE_CLASS[message.tone]}`}
      role="status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold">{message.title}</h2>
            <p className="mt-1 text-sm opacity-90">{message.body}</p>
          </div>
        </div>

        {canTutorResubmit(status) && (
          <Link
            href="/tutor/settings"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Atualizar documento
          </Link>
        )}
      </div>
    </section>
  );
}
