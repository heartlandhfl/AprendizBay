import type { Booking, BookingStatus } from "@/lib/bookings/types";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/types";
import { parseSafeMeetingUrl } from "@/lib/bookings/meeting";
import { getPaymentLifecycle, canStartCheckout } from "@/lib/payments/status";
import { studentReviewAction } from "@/lib/reviews/create-review";
import { getLessonStatus } from "@/lib/lessons/status";
import { lessonPath } from "@/lib/lessons/paths";
import type { Modality } from "@/lib/mock-tutors";
import type {
  EnrichedStudentBooking,
  LearningSummary,
  LessonCta,
  PendingAction,
} from "@/lib/student-dashboard/types";

const UPCOMING_STATUSES = new Set<BookingStatus>(["pending", "confirmed"]);
const UPCOMING_LESSON_WINDOW_MS = 24 * 60 * 60 * 1000;

type TimestampLike = { toMillis: () => number };

function scheduledAtMs(booking: Booking): number {
  return booking.scheduledAt?.toMillis?.() ?? 0;
}

function isFutureBooking(booking: Booking, now: Date): boolean {
  return scheduledAtMs(booking) > now.getTime();
}

function isUpcomingStatus(status: BookingStatus): boolean {
  return UPCOMING_STATUSES.has(status);
}

export function sortUpcomingBookings(bookings: EnrichedStudentBooking[]): EnrichedStudentBooking[] {
  return [...bookings]
    .filter(({ booking }) => isUpcomingStatus(booking.status))
    .sort((a, b) => scheduledAtMs(a.booking) - scheduledAtMs(b.booking));
}

export function getNextLesson(
  bookings: EnrichedStudentBooking[],
  now: Date = new Date(),
): EnrichedStudentBooking | null {
  return (
    sortUpcomingBookings(bookings).find(({ booking }) => isFutureBooking(booking, now)) ?? null
  );
}

export function isOnlineLessonModality(modality: Modality): boolean {
  return modality === "online" || modality === "ambos";
}

export function canStudentJoinLesson(
  booking: Booking,
  modality: Modality,
): boolean {
  const lessonStatus = getLessonStatus(booking);
  return (
    isOnlineLessonModality(modality) &&
    lessonStatus === "confirmed" &&
    Boolean(parseSafeMeetingUrl(booking.meetingUrl))
  );
}

export function getLessonCta(
  booking: Booking,
  modality: Modality,
): LessonCta {
  const href = lessonPath(booking.id);
  if (canStudentJoinLesson(booking, modality)) {
    return {
      label: "Entrar na aula",
      href,
    };
  }

  return {
    label: "Ver aula",
    href,
  };
}

export function formatLessonTypeLabel(type: Booking["type"]): string {
  return BOOKING_TYPE_LABELS[type] ?? "Aula";
}

export function splitDateTime(timestamp: TimestampLike): { date: string; time: string } {
  const date = new Date(timestamp.toMillis());
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
    date: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
    time: timeLabel,
  };
}

export function buildLearningSummary(
  bookings: EnrichedStudentBooking[],
  now: Date = new Date(),
): LearningSummary {
  const upcoming = sortUpcomingBookings(bookings).filter(({ booking }) =>
    isFutureBooking(booking, now),
  );
  const history = bookings.filter(({ booking }) => booking.status === "completed");

  const professorMap = new Map<string, string>();
  for (const entry of bookings) {
    if (entry.booking.status === "cancelled") {
      continue;
    }
    professorMap.set(entry.booking.tutorId, entry.tutorName);
  }

  const classHubIds = new Set(
    bookings
      .filter(({ booking }) => booking.type === "coletivo" && booking.hubId)
      .map(({ booking }) => booking.hubId as string),
  );

  return {
    upcomingCount: upcoming.length,
    professorCount: professorMap.size,
    classCount: classHubIds.size,
    historyCount: history.length,
    upcomingPreview: upcoming.slice(0, 3),
    professors: Array.from(professorMap.entries()).map(([tutorId, tutorName]) => ({
      tutorId,
      tutorName,
    })),
  };
}

export function buildPendingActions(input: {
  bookings: EnrichedStudentBooking[];
  reviewedBookingIds: Set<string>;
  conversations: Array<{
    id: string;
    lastSenderId?: string;
    lastMessage?: string;
    tutorName?: string;
    studentName?: string;
    studentId: string;
    tutorId: string;
  }>;
  studentId: string;
  now?: Date;
}): PendingAction[] {
  const now = input.now ?? new Date();
  const actions: PendingAction[] = [];

  for (const entry of input.bookings) {
    const { booking, tutorName } = entry;
    const lifecycle = getPaymentLifecycle(booking);

    if (canStartCheckout(booking) || lifecycle === "awaiting_payment" || lifecycle === "checkout_created") {
      actions.push({
        id: `payment-${booking.id}`,
        type: "payment_pending",
        title: "Pagamento pendente",
        description: `Finalize o pagamento da aula com ${tutorName}.`,
        href: "/bookings",
        priority: 1,
      });
      continue;
    }

    if (booking.status === "pending" && lifecycle === "not_started") {
      actions.push({
        id: `request-${booking.id}`,
        type: "request_pending",
        title: "Solicitação aguardando professor",
        description: `${tutorName} ainda não confirmou sua aula.`,
        href: "/bookings",
        priority: 2,
      });
    }

    const reviewAction = studentReviewAction(booking.status, input.reviewedBookingIds.has(booking.id));
    if (reviewAction?.kind === "button") {
      actions.push({
        id: `review-${booking.id}`,
        type: "review_pending",
        title: "Avaliação pendente",
        description: `Conte como foi sua aula com ${tutorName}.`,
        href: "/bookings",
        priority: 5,
      });
    }

    if (
      booking.status === "confirmed" &&
      isFutureBooking(booking, now) &&
      scheduledAtMs(booking) - now.getTime() <= UPCOMING_LESSON_WINDOW_MS
    ) {
      actions.push({
        id: `upcoming-${booking.id}`,
        type: "upcoming_lesson",
        title: "Aula próxima",
        description: `Sua aula com ${tutorName} está chegando.`,
        href: lessonPath(booking.id),
        priority: 3,
      });
    }
  }

  for (const conversation of input.conversations) {
    if (conversation.lastSenderId && conversation.lastSenderId !== input.studentId) {
      const name =
        conversation.tutorId === conversation.lastSenderId
          ? conversation.tutorName
          : conversation.studentName;
      actions.push({
        id: `message-${conversation.id}`,
        type: "new_message",
        title: "Mensagem nova",
        description: name
          ? `${name} enviou uma mensagem.`
          : "Você tem uma mensagem não lida.",
        href: `/mensagens?conversa=${encodeURIComponent(conversation.id)}`,
        priority: 4,
      });
    }
  }

  return actions.sort((a, b) => a.priority - b.priority);
}
