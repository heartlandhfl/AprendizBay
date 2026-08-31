import { BadgeCheck, Clock, MapPin, Monitor } from "lucide-react";
import type { TutorProfile } from "@/lib/tutor-profiles";
import TutorAvatar from "@/components/tutor/TutorAvatar";
import TutorRatingStats from "@/components/tutor/TutorRatingStats";
import { formatLocation, modalityLabel } from "@/lib/tutors/format";
import { hasApprovedVerification } from "@/lib/tutors/profile-display";

interface TutorHeaderProps {
  tutor: TutorProfile;
}

export default function TutorHeader({ tutor }: TutorHeaderProps) {
  const location = formatLocation(tutor.city, tutor.state);
  const modality = modalityLabel(tutor.modality);

  return (
    <header className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <TutorAvatar
          name={tutor.name}
          src={tutor.avatarUrl}
          size="lg"
          online={tutor.isOnline}
          className="mx-auto sm:mx-0"
        />

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {tutor.name}
            </h1>
            {hasApprovedVerification(tutor) && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-200">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Professor verificado
              </span>
            )}
          </div>

          {tutor.headline ? (
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              {tutor.headline}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-muted-foreground sm:justify-start">
            <TutorRatingStats
              tutorId={tutor.id}
              initialRating={tutor.rating}
              initialReviewCount={tutor.reviewCount}
            />
            {location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {location}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              {tutor.modality === "presencial" ? (
                <MapPin className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Monitor className="h-4 w-4" aria-hidden="true" />
              )}
              {modality}
            </span>
            {tutor.responseTime ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Responde em {tutor.responseTime}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
