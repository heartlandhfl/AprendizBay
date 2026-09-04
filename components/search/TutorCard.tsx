import Link from "next/link";
import { BadgeCheck, Calendar, MapPin, Monitor, Star, Users } from "lucide-react";
import TutorAvatar from "@/components/tutor/TutorAvatar";
import type { Tutor } from "@/lib/mock-tutors";
import { formatReviewCountLabel, formatTutorRating } from "@/lib/tutors/format";
import { hasPublicRating } from "@/lib/tutors/profile-display";

interface TutorCardProps {
  tutor: Tutor;
  returnTo?: string;
}

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatEducationLevels(levels?: string[]): string | null {
  if (!levels?.length) {
    return null;
  }

  if (levels.length <= 2) {
    return levels.join(" · ");
  }

  return `${levels.slice(0, 2).join(" · ")} +${levels.length - 2}`;
}

function profileHref(tutorId: string, returnTo?: string): string {
  if (!returnTo) {
    return `/tutor/${tutorId}`;
  }

  let normalizedReturnTo = returnTo;
  try {
    normalizedReturnTo = decodeURIComponent(returnTo);
  } catch {
    normalizedReturnTo = returnTo;
  }

  return `/tutor/${tutorId}?from=${encodeURIComponent(normalizedReturnTo)}`;
}

export default function TutorCard({ tutor, returnTo }: TutorCardProps) {
  const savingsPercent =
    tutor.individualPrice > 0
      ? Math.round(
          ((tutor.individualPrice - tutor.collectivePrice) / tutor.individualPrice) * 100,
        )
      : 0;
  const educationLabel = formatEducationLevels(tutor.educationLevels);
  const showLocation = tutor.modality !== "online";

  return (
    <article className="group flex flex-col rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg hover:ring-primary-200/60">
      <div className="flex items-start gap-4">
        <TutorAvatar
          name={tutor.name}
          src={tutor.avatarUrl}
          size="sm"
          online={tutor.isOnline}
        />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-foreground">
            {tutor.name}
          </h3>
          {tutor.isVerified === true ? (
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Professor verificado
            </span>
          ) : null}
          <p className="text-sm font-medium text-primary-600">{tutor.subject}</p>
          {educationLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">{educationLabel}</p>
          ) : null}
          <div className="mt-1 flex items-center gap-1.5 text-sm">
            {hasPublicRating(tutor) ? (
              <>
                <Star
                  className="h-4 w-4 fill-secondary-400 text-secondary-400"
                  aria-hidden="true"
                />
                <span className="font-semibold text-foreground">
                  {formatTutorRating(tutor.rating)}
                </span>
                <span className="text-muted-foreground">
                  ({formatReviewCountLabel(tutor.reviewCount)})
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Ainda sem avaliações</span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {tutor.modality === "online" ? (
              <span className="inline-flex items-center gap-1">
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
                Online
              </span>
            ) : null}
            {showLocation ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {tutor.city}, {tutor.state}
              </span>
            ) : null}
            {tutor.modality === "ambos" ? (
              <span className="inline-flex items-center gap-1">
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
                Online e presencial
              </span>
            ) : null}
            {tutor.hasAvailability ? (
              <span className="inline-flex items-center gap-1 text-primary-700">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                Horários disponíveis
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {tutor.bio}
      </p>

      <div className="mt-4 space-y-2">
        {tutor.lessonTypes.includes("individual") ? (
          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
            <span className="text-sm text-muted-foreground">Aula individual</span>
            <span className="text-sm font-semibold text-foreground">
              {formatPrice(tutor.individualPrice)}/h
            </span>
          </div>
        ) : null}

        {tutor.lessonTypes.includes("coletivo") ? (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-secondary-100 to-secondary-50 px-3 py-2.5 ring-1 ring-secondary-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-secondary-600" aria-hidden="true" />
                <span className="text-sm font-medium text-secondary-800">
                  Aula coletiva
                </span>
              </div>
              <span className="text-base font-bold text-secondary-700">
                {formatPrice(tutor.collectivePrice)}/h
              </span>
            </div>
            {tutor.lessonTypes.includes("individual") && tutor.individualPrice > 0 ? (
              <span className="mt-1 inline-flex items-center rounded-full bg-secondary-500 px-2 py-0.5 text-xs font-semibold text-white">
                Economize {savingsPercent}%
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <Link
        href={profileHref(tutor.id, returnTo)}
        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-primary-700 hover:shadow-soft-lg active:scale-[0.98]"
      >
        Ver Perfil
      </Link>
    </article>
  );
}
