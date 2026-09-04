import { BOOKING_TYPE_LABELS, type Booking } from "@/lib/bookings/types";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { resolveCollectiveClassScheduledAt } from "@/lib/hubs/schedule";
import { lessonPath } from "@/lib/lessons/paths";

function formatScheduledLabel(scheduledAt: Booking["scheduledAt"]): string {
  return scheduledAt.toDate().toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export type UpcomingLessonKind = "individual" | "coletiva";

export interface UpcomingProfessorLesson {
  id: string;
  kind: UpcomingLessonKind;
  typeLabel: string;
  title: string;
  whenLabel: string;
  scheduledAtMs: number;
  lessonHref: string | null;
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

export function buildUpcomingProfessorLessons(
  bookings: Booking[],
  hubs: CollectiveHubLive[],
  studentNames: Record<string, string>,
  now: Date = new Date(),
): UpcomingProfessorLesson[] {
  const nowMs = now.getTime();
  const upcomingBookings = bookings
    .filter((booking) => booking.status === "confirmed")
    .filter((booking) => booking.scheduledAt.toMillis() >= nowMs)
    .map((booking) => {
      const kind = bookingKind(booking);
      return {
        id: `booking-${booking.id}`,
        kind,
        typeLabel: BOOKING_TYPE_LABELS[booking.type],
        title: studentNames[booking.studentId] || "Aluno",
        whenLabel: formatScheduledLabel(booking.scheduledAt),
        scheduledAtMs: booking.scheduledAt.toMillis(),
        lessonHref: lessonPath(booking.id),
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
    .map(({ hub, scheduledAt }) => ({
      id: `hub-${hub.id}`,
      kind: "coletiva" as const,
      typeLabel: "Coletiva",
      title: hub.title,
      whenLabel: formatHubDateTime(hub),
      scheduledAtMs: scheduledAt.getTime(),
      lessonHref: null,
      hubHref: `/turmas/${hub.id}`,
    }));

  return [...upcomingBookings, ...upcomingHubs].sort(
    (left, right) => left.scheduledAtMs - right.scheduledAtMs,
  );
}
