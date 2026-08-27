import Image from "next/image";
import { BadgeCheck, Clock, MapPin, Monitor, Star, Users } from "lucide-react";
import type { TutorProfile } from "@/lib/tutor-profiles";

interface TutorHeaderProps {
  tutor: TutorProfile;
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

export default function TutorHeader({ tutor }: TutorHeaderProps) {
  return (
    <header className="rounded-2xl bg-surface p-6 shadow-card ring-1 ring-border/50 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative mx-auto shrink-0 sm:mx-0">
          <div className="relative h-32 w-32 overflow-hidden rounded-full ring-4 ring-primary-100 sm:h-40 sm:w-40">
            <Image
              src={tutor.avatarUrl}
              alt={`Foto de perfil de ${tutor.name}`}
              width={160}
              height={160}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
          {tutor.isOnline && (
            <span
              className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-4 border-surface bg-primary-500"
              title="Online agora"
              aria-label="Online agora"
            />
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {tutor.name}
            </h1>
            {tutor.isVerified && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-200">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Perfil Verificado
              </span>
            )}
          </div>

          <p className="mt-1 text-lg font-medium text-primary-600">
            {tutor.subject}
          </p>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            {tutor.headline}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
            <span className="inline-flex items-center gap-1">
              <Star
                className="h-4 w-4 fill-secondary-400 text-secondary-400"
                aria-hidden="true"
              />
              <span className="font-semibold text-foreground">{tutor.rating}</span>
              ({tutor.reviewCount} avaliações)
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              {tutor.modality === "online" ? (
                <Monitor className="h-4 w-4" aria-hidden="true" />
              ) : (
                <MapPin className="h-4 w-4" aria-hidden="true" />
              )}
              {tutor.city}, {tutor.state}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-2xl bg-muted/60 px-4 py-3 text-center sm:text-left">
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:justify-start">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Horas ensinadas
              </div>
              <p className="mt-1 text-xl font-bold text-foreground">
                {formatNumber(tutor.hoursTaught)}+
              </p>
            </div>
            <div className="rounded-2xl bg-muted/60 px-4 py-3 text-center sm:text-left">
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:justify-start">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Alunos atendidos
              </div>
              <p className="mt-1 text-xl font-bold text-foreground">
                {formatNumber(tutor.studentsServed)}+
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
