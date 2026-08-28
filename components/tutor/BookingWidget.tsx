"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Loader2,
  MapPin,
  Monitor,
  User,
  Users,
} from "lucide-react";
import type { CollectiveHub, TutorProfile } from "@/lib/tutor-profiles";
import { useAuth } from "@/lib/auth/AuthContext";
import { createBooking, defaultScheduledAt } from "@/lib/bookings/service";

interface BookingWidgetProps {
  tutor: TutorProfile;
}

type BookingOption = "individual" | "coletivo";

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function HubSlotCard({
  hub,
  selected,
  onSelect,
}: {
  hub: CollectiveHub;
  selected: boolean;
  onSelect: () => void;
}) {
  const spotsLeft = hub.maxStudents - hub.confirmedStudents;
  const progressPercent = (hub.confirmedStudents / hub.maxStudents) * 100;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
        selected
          ? "border-secondary-400 bg-secondary-50 ring-2 ring-secondary-200"
          : "border-border bg-muted/30 hover:border-secondary-300 hover:bg-secondary-50/50"
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-foreground">{hub.title}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{hub.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary-500 px-2 py-0.5 text-xs font-bold text-white">
          {formatPrice(hub.currentPrice)}/h
        </span>
      </div>

      <p className="mt-3 text-sm text-foreground">
        <span className="font-semibold text-secondary-700">
          {hub.confirmedStudents}/{hub.maxStudents} alunos confirmados.
        </span>{" "}
        O preço cai para{" "}
        <span className="font-bold text-primary-600">
          {formatPrice(hub.fullPrice)}/h
        </span>{" "}
        se a turma lotar!
      </p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {spotsLeft} vaga{spotsLeft !== 1 ? "s" : ""} restante
            {spotsLeft !== 1 ? "s" : ""}
          </span>
          <span>{Math.round(progressPercent)}% preenchido</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-secondary-400 to-secondary-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={hub.confirmedStudents}
            aria-valuemin={0}
            aria-valuemax={hub.maxStudents}
            aria-label={`${hub.confirmedStudents} de ${hub.maxStudents} vagas preenchidas`}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        {hub.modality === "online" ? (
          <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {hub.schedule}
      </div>
    </button>
  );
}

export default function BookingWidget({ tutor }: BookingWidgetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userDoc, loading: authLoading } = useAuth();
  const [option, setOption] = useState<BookingOption>("coletivo");
  const [selectedHubId, setSelectedHubId] = useState(
    tutor.collectiveHubs[0]?.id ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedHub = tutor.collectiveHubs.find((h) => h.id === selectedHubId);

  async function handleReserve() {
    setError(null);
    setSuccess(null);

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (userDoc?.role !== "student") {
      setError("Apenas alunos podem reservar aulas.");
      return;
    }

    if (option === "coletivo" && !selectedHubId) {
      setError("Selecione uma turma coletiva para continuar.");
      return;
    }

    setSubmitting(true);

    try {
      await createBooking(user.uid, {
        tutorId: tutor.id,
        type: option,
        price:
          option === "individual" ? tutor.individualPrice : selectedHub!.currentPrice,
        hubId: option === "coletivo" ? selectedHubId : undefined,
        scheduledAt: defaultScheduledAt(),
      });

      setSuccess("Reserva enviada! Acompanhe o status em Minhas aulas.");
      setTimeout(() => router.push("/bookings"), 1200);
    } catch {
      setError("Não foi possível criar a reserva. Verifique se o professor está verificado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="rounded-2xl bg-surface p-6 shadow-soft-lg ring-1 ring-border/50">
        <h2 className="text-lg font-bold text-foreground">Agendar Aula</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o formato ideal para você
        </p>

        <div className="mt-5 flex rounded-2xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setOption("individual")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              option === "individual"
                ? "bg-surface text-primary-700 shadow-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={option === "individual"}
          >
            <User className="h-4 w-4" aria-hidden="true" />
            Individual
          </button>
          <button
            type="button"
            onClick={() => setOption("coletivo")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              option === "coletivo"
                ? "bg-surface text-secondary-700 shadow-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={option === "coletivo"}
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Coletivo
          </button>
        </div>

        {option === "individual" ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <h3 className="font-semibold text-foreground">
                Aula Individual (1-on-1)
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Atenção exclusiva do professor, horários flexíveis e ritmo
                personalizado.
              </p>
              <p className="mt-4 text-2xl font-bold text-foreground">
                {formatPrice(tutor.individualPrice)}
                <span className="text-base font-normal text-muted-foreground">
                  /hora
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
              Primeira aula disponível: amanhã
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-secondary-200 bg-gradient-to-br from-secondary-50 to-secondary-100/50 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-secondary-800">
                <Users className="h-4 w-4" aria-hidden="true" />
                Hub de Aprendizado Coletivo
              </h3>
              <p className="mt-2 text-sm text-secondary-700/80">
                Entre em turmas abertas e economize. Quanto mais alunos, menor o
                preço por pessoa!
              </p>
            </div>

            <div className="space-y-3">
              {tutor.collectiveHubs.map((hub) => (
                <HubSlotCard
                  key={hub.id}
                  hub={hub}
                  selected={selectedHubId === hub.id}
                  onSelect={() => setSelectedHubId(hub.id)}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 rounded-2xl bg-primary-50 px-4 py-3 text-sm text-primary-800" role="status">
            {success}
          </p>
        )}

        <button
          type="button"
          onClick={handleReserve}
          disabled={submitting || authLoading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3.5 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:scale-[1.02] hover:bg-primary-700 hover:shadow-soft-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Reservando...
            </>
          ) : (
            "Reservar Minha Vaga"
          )}
        </button>

        {option === "coletivo" && selectedHub && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Você está reservando:{" "}
            <span className="font-medium text-foreground">
              {selectedHub.title}
            </span>
          </p>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Cancelamento gratuito até 24h antes da aula
        </p>
      </div>
    </aside>
  );
}
