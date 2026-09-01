"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Monitor,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { HUB_JOIN_ERRORS, type HubJoinErrorCode } from "@/lib/hubs/join";
import { collectiveSavingsPercent, formatVacancyLabel } from "@/lib/hubs/public";
import CatalogLoadState from "@/components/catalog/CatalogLoadState";
import {
  fetchCollectiveHubById,
  formatHubPrice,
  joinCollectiveClassAndBook,
} from "@/lib/hubs/service";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { isCatalogProblem, type HubLoadState } from "@/lib/tutors/catalog";

interface CollectiveClassDetailProps {
  hubId: string;
}

function joinErrorMessage(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: string }).code)
    : "";
  if (code in HUB_JOIN_ERRORS) {
    return HUB_JOIN_ERRORS[code as HubJoinErrorCode];
  }

  const message = error instanceof Error ? error.message : "";
  if (message && Object.values(HUB_JOIN_ERRORS).includes(message)) {
    return message;
  }

  return "Não foi possível entrar na turma. Tente novamente.";
}

export default function CollectiveClassDetail({ hubId }: CollectiveClassDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userDoc, loading: authLoading } = useAuth();
  const [hub, setHub] = useState<CollectiveHubLive | null>(null);
  const [hubState, setHubState] = useState<HubLoadState>("ok");
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHub() {
      setLoading(true);
      try {
        const result = await fetchCollectiveHubById(hubId, user?.uid);
        if (!cancelled) {
          setHub(result.hub);
          setHubState(result.state);
        }
      } catch {
        if (!cancelled) {
          setHub(null);
          setHubState("error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHub();

    return () => {
      cancelled = true;
    };
  }, [hubId, user?.uid, reloadToken]);

  async function handleJoin() {
    setError(null);
    setSuccess(null);

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (userDoc?.role !== "student") {
      setError("Apenas alunos podem entrar em turmas.");
      return;
    }

    if (!hub) {
      setError(HUB_JOIN_ERRORS.not_found);
      return;
    }

    setSubmitting(true);

    try {
      await joinCollectiveClassAndBook(user.uid, {
        hubId: hub.id,
      });

      trackEvent(ANALYTICS_EVENTS.bookingStarted, {
        tutor_id: hub.tutorId,
        type: "coletivo",
        hub_id: hub.id,
      });

      setSuccess(
        "Vaga reservada! Depois que o professor confirmar, você pagará a aula em Minhas aulas.",
      );
      setHub((current) =>
        current
          ? {
              ...current,
              confirmedStudents: current.confirmedStudents + 1,
              isJoined: true,
              status:
                current.confirmedStudents + 1 >= current.maxStudents ? "full" : current.status,
            }
          : current,
      );
      setTimeout(() => router.push("/bookings"), 1200);
    } catch (joinError) {
      setError(joinErrorMessage(joinError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando turma...</span>
      </div>
    );
  }

  if (isCatalogProblem(hubState)) {
    return (
      <CatalogLoadState
        kind={hubState}
        scope="hubs"
        onRetry={() => setReloadToken((token) => token + 1)}
      />
    );
  }

  if (!hub) {
    return (
      <div className="rounded-2xl bg-muted/60 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-foreground">Turma não encontrada</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta aula coletiva pode ter sido encerrada ou o link está incorreto.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-flex rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Voltar à busca
        </Link>
      </div>
    );
  }

  const savings = collectiveSavingsPercent(hub.individualPrice ?? 0, hub.currentPrice);
  const isFull = hub.confirmedStudents >= hub.maxStudents || hub.status === "full";
  const isClosed = hub.status === "closed" || hub.status === "cancelled";
  const dateLabel = hub.scheduledDate
    ? new Date(`${hub.scheduledDate}T00:00:00`).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <article className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60 sm:p-8">
      <Link
        href="/search"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar aos resultados
      </Link>

      <p className="text-xs font-bold uppercase tracking-wide text-secondary-700">
        Aula coletiva
      </p>
      {hub.subject ? (
        <p className="mt-2 text-sm font-semibold text-primary-600">{hub.subject}</p>
      ) : null}
      <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">{hub.title}</h1>
      {hub.tutorName ? (
        <p className="mt-2 text-muted-foreground">
          Professor:{" "}
          <Link href={`/tutor/${hub.tutorId}`} className="font-medium text-foreground hover:text-primary-600">
            {hub.tutorName}
          </Link>
        </p>
      ) : null}

      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{hub.description}</p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        {dateLabel ? (
          <div className="flex items-center gap-2 rounded-2xl bg-muted/50 px-4 py-3">
            <Calendar className="h-4 w-4 text-secondary-600" aria-hidden="true" />
            <div>
              <dt className="text-xs text-muted-foreground">Data</dt>
              <dd className="capitalize font-medium text-foreground">{dateLabel}</dd>
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-2 rounded-2xl bg-muted/50 px-4 py-3">
          <Clock className="h-4 w-4 text-secondary-600" aria-hidden="true" />
          <div>
            <dt className="text-xs text-muted-foreground">Horário</dt>
            <dd className="font-medium text-foreground">{hub.startTime || hub.schedule}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-muted/50 px-4 py-3">
          {hub.modality === "online" ? (
            <Monitor className="h-4 w-4 text-secondary-600" aria-hidden="true" />
          ) : (
            <MapPin className="h-4 w-4 text-secondary-600" aria-hidden="true" />
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Modalidade</dt>
            <dd className="font-medium text-foreground">
              {hub.modality === "online" ? "Online" : "Presencial"}
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-secondary-50 px-4 py-3 ring-1 ring-secondary-200/80">
          <Users className="h-4 w-4 text-secondary-600" aria-hidden="true" />
          <div>
            <dt className="text-xs text-secondary-700">Vagas</dt>
            <dd className="font-semibold text-secondary-800">
              {formatVacancyLabel(hub.confirmedStudents, hub.maxStudents)}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-6 rounded-2xl bg-gradient-to-r from-secondary-100 to-secondary-50 p-5 ring-1 ring-secondary-200/80">
        <p className="text-sm text-secondary-800">Preço por aluno</p>
        <p className="mt-1 text-3xl font-bold text-secondary-700">
          {formatHubPrice(hub.currentPrice)}
          <span className="text-base font-normal text-secondary-700/80">/h</span>
        </p>
        {savings > 0 ? (
          <p className="mt-2 text-sm font-medium text-secondary-800">
            Economia de {savings}% versus aula individual
            {hub.individualPrice ? ` (${formatHubPrice(hub.individualPrice)}/h)` : ""}
          </p>
        ) : null}
      </div>

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

      {hub.isJoined ? (
        <p className="mt-6 rounded-2xl bg-primary-50 px-4 py-3 text-center text-sm font-medium text-primary-800">
          Você já está inscrito nesta turma. Acompanhe o pagamento em Minhas aulas.
        </p>
      ) : isClosed ? (
        <p className="mt-6 rounded-2xl bg-muted px-4 py-3 text-center text-sm font-medium text-muted-foreground">
          Esta turma não aceita novos alunos.
        </p>
      ) : isFull ? (
        <p className="mt-6 rounded-2xl bg-muted px-4 py-3 text-center text-sm font-medium text-muted-foreground">
          Turma completa
        </p>
      ) : (
        <button
          type="button"
          onClick={handleJoin}
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3.5 text-sm font-bold text-white shadow-soft transition-all hover:bg-primary-700 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Reservando vaga...
            </>
          ) : (
            "Entrar na turma"
          )}
        </button>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Ao entrar, você reserva a vaga e segue para o pagamento depois da confirmação do
        professor. Cancelamento gratuito até 24h antes da aula.
      </p>
    </article>
  );
}
