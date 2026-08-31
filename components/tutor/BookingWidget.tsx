"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Loader2,
  User,
  Users,
} from "lucide-react";
import CollectiveHubList from "@/components/hubs/CollectiveHubList";
import IndividualSlotPicker from "@/components/tutor/IndividualSlotPicker";
import type { TutorProfile } from "@/lib/tutor-profiles";
import { useAuth } from "@/lib/auth/AuthContext";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { createBooking, formatBookingPrice } from "@/lib/bookings/service";
import { HUB_JOIN_ERRORS, type HubJoinErrorCode } from "@/lib/hubs/join";
import { resolveCollectiveClassScheduledAt } from "@/lib/hubs/schedule";
import { joinCollectiveClassAndBook } from "@/lib/hubs/service";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import {
  defaultBookingOption,
  offeredLessonTypes,
  offersLessonType,
} from "@/lib/tutors/profile-display";

interface BookingWidgetProps {
  tutor: TutorProfile;
}

type BookingOption = "individual" | "coletivo";

export default function BookingWidget({ tutor }: BookingWidgetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userDoc, loading: authLoading } = useAuth();
  const offeredTypes = offeredLessonTypes(tutor);
  const [option, setOption] = useState<BookingOption>(
    () => defaultBookingOption(tutor) ?? "individual",
  );
  const [hubs, setHubs] = useState<CollectiveHubLive[]>([]);
  const [selectedHubId, setSelectedHubId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedHub = hubs.find((hub) => hub.id === selectedHubId);

  useEffect(() => {
    if (selectedHubId || hubs.length === 0) {
      return;
    }

    const firstAvailable = hubs.find(
      (hub) => hub.confirmedStudents < hub.maxStudents,
    );
    setSelectedHubId(firstAvailable?.id ?? hubs[0]?.id ?? "");
  }, [hubs, selectedHubId]);

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

    if (option === "individual" && !selectedSlot) {
      setError("Selecione um horário disponível para continuar.");
      return;
    }

    setSubmitting(true);

    try {
      const scheduledAt =
        option === "individual"
          ? selectedSlot!
          : resolveCollectiveClassScheduledAt(selectedHub!);

      if (option === "coletivo") {
        await joinCollectiveClassAndBook(user.uid, {
          hubId: selectedHubId,
          tutorId: tutor.id,
          price: selectedHub!.currentPrice,
          scheduledAt,
        });
      } else {
        await createBooking(user.uid, {
          tutorId: tutor.id,
          type: option,
          price: tutor.individualPrice,
          scheduledAt,
        });
      }

      trackEvent(ANALYTICS_EVENTS.bookingStarted, {
        tutor_id: tutor.id,
        type: option,
      });

      setSuccess(
        "Reserva enviada! Depois que o professor confirmar, você pagará a aula em Minhas aulas.",
      );
      setTimeout(() => router.push("/bookings"), 1200);
    } catch (bookingError) {
      const code =
        bookingError && typeof bookingError === "object" && "code" in bookingError
          ? String((bookingError as { code?: string }).code)
          : "";
      if (code in HUB_JOIN_ERRORS) {
        setError(HUB_JOIN_ERRORS[code as HubJoinErrorCode]);
      } else {
        setError(
          "Não foi possível criar a reserva. Verifique se o professor está verificado e se ainda há vagas.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside id="agendar" className="scroll-mt-24 lg:sticky lg:top-24">
      <div className="rounded-2xl bg-surface p-5 shadow-soft-lg ring-1 ring-border/50 sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Agendar aula</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o formato ideal para você
        </p>

        {offeredTypes.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            Este professor ainda não cadastrou opções de agendamento.
          </p>
        ) : null}

        {offeredTypes.length > 1 ? (
          <div className="mt-5 flex rounded-2xl bg-muted p-1">
            {offersLessonType(tutor, "individual") ? (
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
            ) : null}
            {offersLessonType(tutor, "coletivo") ? (
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
            ) : null}
          </div>
        ) : null}

        {offeredTypes.length > 0 && option === "individual" && offersLessonType(tutor, "individual") ? (
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
                {formatBookingPrice(tutor.individualPrice)}
                <span className="text-base font-normal text-muted-foreground">
                  /hora
                </span>
              </p>
            </div>

            <IndividualSlotPicker
              tutorId={tutor.id}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
            />
          </div>
        ) : offeredTypes.length > 0 && option === "coletivo" && offersLessonType(tutor, "coletivo") ? (
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

            <CollectiveHubList
              tutorId={tutor.id}
              selectable
              showDetailLinks
              selectedHubId={selectedHubId}
              onSelectHub={setSelectedHubId}
              onHubsChange={setHubs}
              initialHubs={tutor.collectiveHubs}
            />
          </div>
        ) : null}

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

        {offeredTypes.length > 0 ? (
          <button
            type="button"
            onClick={handleReserve}
            disabled={submitting || authLoading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3.5 text-sm font-bold text-white shadow-soft transition-all duration-200 hover:scale-[1.02] hover:bg-primary-700 hover:shadow-soft-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Agendando...
              </>
            ) : (
              "Agendar aula"
            )}
          </button>
        ) : null}

        {option === "coletivo" && selectedHub && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Você está reservando:{" "}
            <span className="font-medium text-foreground">
              {selectedHub.title}
            </span>
            {" · "}
            Horário da turma:{" "}
            <span className="font-medium text-foreground">{selectedHub.schedule}</span>
          </p>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Cancelamento gratuito até 24h antes da aula, com reembolso integral do valor pago.
          Depois disso, o valor pago não é reembolsado.
        </p>
      </div>
    </aside>
  );
}
