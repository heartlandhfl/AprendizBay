import { canTutorMarkCompleted, COMPLETE_COPY } from "@/lib/bookings/complete-lesson";
import { parseSafeMeetingUrl } from "@/lib/bookings/meeting";
import { BOOKING_TYPE_LABELS, type Booking } from "@/lib/bookings/types";
import { canAccessLesson } from "@/lib/lessons/access";
import { getLessonImportantNotes, getMissingMeetingUrlMessage } from "@/lib/lessons/copy";
import { lessonBackLink } from "@/lib/lessons/paths";
import { getLessonStatus, LESSON_STATUS_LABELS, type LessonStatus } from "@/lib/lessons/status";
import type { Modality } from "@/lib/mock-tutors";
import { modalityLabel } from "@/lib/tutors/format";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

export interface LessonParticipantView {
  id: string;
  tutorName: string;
  studentName: string;
  subject: string;
  dateLabel: string;
  timeLabel: string;
  modalityLabel: string;
  typeLabel: string;
  status: LessonStatus;
  statusLabel: string;
  meetingUrl: string | null;
  canJoin: boolean;
  showJoinSection: boolean;
  missingMeetingMessage: string | null;
  importantNotes: string[];
  showCompleteButton: boolean;
  canComplete: boolean;
  completeHint: string | null;
  backHref: string;
  backLabel: string;
}

export interface LessonViewMeta {
  tutorName: string;
  studentName: string;
  subject: string;
  modality: Modality;
  viewerRole?: string;
}

const PAYMENT_KEYS = [
  "price",
  "platformFee",
  "tutorAmount",
  "paymentId",
  "asaasCheckoutId",
  "refundId",
  "refundStatus",
  "refundAmount",
] as const;

export function formatLessonDate(scheduledAt: { toDate: () => Date } | Date | undefined): string {
  const date = toDate(scheduledAt);
  if (!date) {
    return "Data não informada";
  }
  const label = date.toLocaleDateString("pt-BR", DATE_FORMAT);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatLessonTime(scheduledAt: { toDate: () => Date } | Date | undefined): string {
  const date = toDate(scheduledAt);
  if (!date) {
    return "Horário não informado";
  }
  return date.toLocaleTimeString("pt-BR", TIME_FORMAT);
}

function toDate(value: { toDate: () => Date } | Date | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : value.toDate();
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOnlineModality(modality: Modality): boolean {
  return modality === "online" || modality === "ambos";
}

export function buildLessonView(
  booking: Booking,
  meta: LessonViewMeta,
  viewerUid: string,
  now: Date = new Date(),
): LessonParticipantView | null {
  if (!canAccessLesson(booking, viewerUid)) {
    return null;
  }

  const status = getLessonStatus(booking);
  const meetingUrl = parseSafeMeetingUrl(booking.meetingUrl);
  const online = isOnlineModality(meta.modality);
  const isTutor = booking.tutorId === viewerUid;
  const showCompleteButton = isTutor && status === "confirmed";
  const canComplete = showCompleteButton && canTutorMarkCompleted(booking, now);
  const back = lessonBackLink(meta.viewerRole ?? (isTutor ? "tutor" : "student"));
  const showJoinSection = online && status !== "cancelled";
  const canJoin = online && status === "confirmed" && Boolean(meetingUrl);

  let completeHint: string | null = null;
  if (showCompleteButton && !canComplete) {
    completeHint =
      booking.paymentStatus !== "paid"
        ? COMPLETE_COPY.tutorNeedsPayment
        : COMPLETE_COPY.tutorBeforeSchedule;
  }

  return {
    id: booking.id,
    tutorName: meta.tutorName,
    studentName: meta.studentName,
    subject: meta.subject,
    dateLabel: formatLessonDate(booking.scheduledAt),
    timeLabel: formatLessonTime(booking.scheduledAt),
    modalityLabel: modalityLabel(meta.modality),
    typeLabel: BOOKING_TYPE_LABELS[booking.type] ?? booking.type,
    status,
    statusLabel: LESSON_STATUS_LABELS[status],
    meetingUrl,
    canJoin,
    showJoinSection,
    missingMeetingMessage:
      showJoinSection && !canJoin ? getMissingMeetingUrlMessage(status) : null,
    importantNotes: getLessonImportantNotes({ status, modality: meta.modality }),
    showCompleteButton,
    canComplete,
    completeHint,
    backHref: back.href,
    backLabel: back.label,
  };
}

export function lessonViewOmitsPaymentFields(view: LessonParticipantView): boolean {
  const serialized = JSON.stringify(view);
  return PAYMENT_KEYS.every((key) => !serialized.includes(`"${key}"`));
}
