import { BOOKING_TYPE_LABELS, type Booking } from "@/lib/bookings/types";
import { parseSafeMeetingUrl } from "@/lib/bookings/meeting";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { resolveCollectiveClassScheduledAt } from "@/lib/hubs/schedule";
import { lessonPath } from "@/lib/lessons/paths";
import type { Modality } from "@/lib/mock-tutors";
import { modalityLabel } from "@/lib/tutors/format";

function formatScheduledLabel(scheduledAt: Booking["scheduledAt"]): string {
  return scheduledAt.toDate().toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function splitLessonDateTime(scheduledAt: Booking["scheduledAt"]): {
  dateLabel: string;
  timeLabel: string;
} {
  const date = scheduledAt.toDate();
  const dateLabel = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeLabel = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
    timeLabel,
  };
}

export type UpcomingLessonKind = "individual" | "coletiva";

export interface UpcomingProfessorLesson {
  id: string;
  kind: UpcomingLessonKind;
  typeLabel: string;
  title: string;
  studentName: string;
  subject: string;
  modalityLabel: string;
  dateLabel: string;
  timeLabel: string;
  whenLabel: string;
  scheduledAtMs: number;
  lessonHref: string | null;
  lessonCtaLabel: "Entrar na aula" | "Ver aula" | null;
  hubHref?: string;
}

const HUB_STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  full: "Completa",
  closed: "Encerrada",
  cancelled: "Cancelada",
};

export function hubStatusLabel(status: string | undefined): string {
  if (!status) {
    return "Aberta";
  }
  return HUB_STATUS_LABELS[status] ?? status;
}

export function formatHubDateTime(hub: {
  scheduledDate?: string;
  startTime?: string;
  schedule?: string;
}): string {
  if (hub.scheduledDate && hub.startTime) {
    const date = new Date(`${hub.scheduledDate}T${hub.startTime}:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
  }

  if (hub.scheduledDate) {
    const date = new Date(`${hub.scheduledDate}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      const dateLabel = date.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return hub.startTime ? `${dateLabel} · ${hub.startTime}` : dateLabel;
    }
  }

  return hub.schedule?.trim() || "Horário a confirmar";
}

function bookingKind(booking: Booking): UpcomingLessonKind {
  return booking.type === "coletivo" ? "coletiva" : "individual";
}

function isConfirmedPaidUpcoming(booking: Booking, nowMs: number): boolean {
  return (
    booking.status === "confirmed" &&
    booking.paymentStatus === "paid" &&
    booking.scheduledAt.toMillis() >= nowMs
  );
}

function lessonCtaLabel(booking: Booking): "Entrar na aula" | "Ver aula" {
  if (booking.status === "confirmed" && parseSafeMeetingUrl(booking.meetingUrl)) {
    return "Entrar na aula";
  }

  return "Ver aula";
}

function resolveSubject(
  booking: Booking,
  hubsById: Record<string, CollectiveHubLive>,
  tutorSubject?: string,
): string {
  if (booking.type === "coletivo" && booking.hubId) {
    return hubsById[booking.hubId]?.subject || tutorSubject || "Turma coletiva";
  }

  return tutorSubject || "Aula";
}

function resolveModality(
  booking: Booking,
  hubsById: Record<string, CollectiveHubLive>,
  tutorModality?: Modality,
): Modality {
  if (booking.type === "coletivo" && booking.hubId) {
    const hubModality = hubsById[booking.hubId]?.modality;
    if (hubModality === "online" || hubModality === "presencial") {
      return hubModality;
    }
  }

  return tutorModality || "online";
}

export interface TutorLessonProfileContext {
  subject?: string;
  modality?: Modality;
}

export function buildUpcomingProfessorLessons(
  bookings: Booking[],
  hubs: CollectiveHubLive[],
  studentNames: Record<string, string>,
  tutorProfile: TutorLessonProfileContext | null,
  now: Date = new Date(),
): UpcomingProfessorLesson[] {
  const nowMs = now.getTime();
  const hubsById = Object.fromEntries(hubs.map((hub) => [hub.id, hub]));
  const tutorSubject = tutorProfile?.subject?.trim();
  const tutorModality = tutorProfile?.modality;

  const upcomingBookings = bookings
    .filter((booking) => isConfirmedPaidUpcoming(booking, nowMs))
    .map((booking) => {
      const kind = bookingKind(booking);
      const studentName = studentNames[booking.studentId] || "Aluno";
      const subject = resolveSubject(booking, hubsById, tutorSubject);
      const resolvedModality = resolveModality(booking, hubsById, tutorModality);
      const { dateLabel, timeLabel } = splitLessonDateTime(booking.scheduledAt);

      return {
        id: `booking-${booking.id}`,
        kind,
        typeLabel: BOOKING_TYPE_LABELS[booking.type],
        title: kind === "individual" ? studentName : subject,
        studentName,
        subject,
        modalityLabel: modalityLabel(resolvedModality),
        dateLabel,
        timeLabel,
        whenLabel: formatScheduledLabel(booking.scheduledAt),
        scheduledAtMs: booking.scheduledAt.toMillis(),
        lessonHref: lessonPath(booking.id),
        lessonCtaLabel: lessonCtaLabel(booking),
        hubHref: booking.hubId ? `/turmas/${booking.hubId}` : undefined,
      } satisfies UpcomingProfessorLesson;
    });

  const bookedHubIds = new Set(
    bookings.filter((booking) => booking.hubId).map((booking) => booking.hubId as string),
  );

  const upcomingHubs = hubs
    .filter((hub) => hub.status !== "cancelled" && hub.status !== "closed")
    .map((hub) => {
      const scheduledAt = resolveCollectiveClassScheduledAt(hub, now);
      return { hub, scheduledAt };
    })
    .filter(({ hub, scheduledAt }) => {
      if (bookedHubIds.has(hub.id)) {
        return false;
      }
      return scheduledAt.getTime() >= nowMs;
    })
    .map(({ hub, scheduledAt }) => {
      const whenLabel = formatHubDateTime(hub);
      const date = scheduledAt;
      const dateLabel = date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const timeLabel = hub.startTime || date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        id: `hub-${hub.id}`,
        kind: "coletiva" as const,
        typeLabel: "Coletiva",
        title: hub.title,
        studentName: "Turma coletiva",
        subject: hub.subject || tutorSubject || "Turma coletiva",
        modalityLabel: modalityLabel(hub.modality === "presencial" ? "presencial" : "online"),
        dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
        timeLabel,
        whenLabel,
        scheduledAtMs: scheduledAt.getTime(),
        lessonHref: null,
        lessonCtaLabel: null,
        hubHref: `/turmas/${hub.id}`,
      } satisfies UpcomingProfessorLesson;
    });

  return [...upcomingBookings, ...upcomingHubs].sort(
    (left, right) => left.scheduledAtMs - right.scheduledAtMs,
  );
}
