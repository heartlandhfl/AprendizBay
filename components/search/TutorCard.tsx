import Image from "next/image";
import Link from "next/link";
import { MapPin, Monitor, Star, Users } from "lucide-react";
import type { Tutor } from "@/lib/mock-tutors";

interface TutorCardProps {
  tutor: Tutor;
}

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function TutorCard({ tutor }: TutorCardProps) {
  const savingsPercent = Math.round(
    ((tutor.individualPrice - tutor.collectivePrice) / tutor.individualPrice) * 100
  );

  return (
    <article className="group flex flex-col rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg hover:ring-primary-200/60">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-border/60 transition-all duration-300 group-hover:ring-primary-200">
            <Image
              src={tutor.avatarUrl}
              alt={`Foto de perfil de ${tutor.name}`}
              width={64}
              height={64}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
          {tutor.isOnline && (
            <span
              className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-primary-500"
              title="Online agora"
              aria-label="Online agora"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-foreground">
            {tutor.name}
          </h3>
          <p className="text-sm font-medium text-primary-600">{tutor.subject}</p>
          <div className="mt-1 flex items-center gap-1.5 text-sm">
            <Star
              className="h-4 w-4 fill-secondary-400 text-secondary-400"
              aria-hidden="true"
            />
            <span className="font-semibold text-foreground">{tutor.rating}</span>
            <span className="text-muted-foreground">
              ({tutor.reviewCount} avaliações)
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            {tutor.modality === "online" ? (
              <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {tutor.city}, {tutor.state}
              {tutor.modality === "ambos" && " · Online e Presencial"}
              {tutor.modality === "online" && " · Online"}
              {tutor.modality === "presencial" && " · Presencial"}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {tutor.bio}
      </p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
          <span className="text-sm text-muted-foreground">Individual</span>
          <span className="text-sm font-semibold text-foreground">
            {formatPrice(tutor.individualPrice)}/h
          </span>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-secondary-100 to-secondary-50 px-3 py-2.5 ring-1 ring-secondary-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-secondary-600" aria-hidden="true" />
              <span className="text-sm font-medium text-secondary-800">
                Aula Coletiva
              </span>
            </div>
            <span className="text-base font-bold text-secondary-700">
              {formatPrice(tutor.collectivePrice)}/h
            </span>
          </div>
          <span className="mt-1 inline-flex items-center rounded-full bg-secondary-500 px-2 py-0.5 text-xs font-semibold text-white">
            Economize {savingsPercent}%
          </span>
        </div>
      </div>

      <Link
        href={`/professores/${tutor.id}`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-primary-700 hover:shadow-soft-lg active:scale-[0.98]"
      >
        Ver Perfil
      </Link>
    </article>
  );
}
