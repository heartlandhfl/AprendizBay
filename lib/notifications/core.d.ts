export const BOOKING_TYPE_LABELS: Record<string, string>;
export const DEFAULT_FROM: string;
export const REMINDER_MIN_MS: number;
export const REMINDER_MAX_MS: number;

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface PendingBookingEmailInput {
  tutorName: string;
  studentName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  dashboardUrl?: string;
}

export interface ConfirmedBookingEmailInput {
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  meetingUrl?: string;
  bookingsUrl?: string;
}

export interface LessonReminderEmailInput {
  recipientName: string;
  studentName: string;
  tutorName: string;
  bookingType?: string;
  scheduledAt: Date | string;
  meetingUrl?: string;
}

export interface NewReviewEmailInput {
  tutorName: string;
  studentName: string;
  rating: number;
  comment?: string;
  dashboardUrl?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SendEmailResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  provider?: "jetsend" | "resend" | "sendgrid";
}

export function escapeHtml(value: unknown): string;
export function formatDatePtBr(value: Date | string): string;
export function bookingTypeLabel(type?: string): string;
export function buildPendingBookingEmail(input: PendingBookingEmailInput): EmailContent;
export function buildConfirmedBookingEmail(input: ConfirmedBookingEmailInput): EmailContent;
export function buildLessonReminderEmail(input: LessonReminderEmailInput): EmailContent;
export function buildNewReviewEmail(input: NewReviewEmailInput): EmailContent;
export function configuredProvider(): "jetsend" | "resend" | "sendgrid" | null;
export function resolveFromAddress(): string;
export function sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
export function isWithinLessonReminderWindow(
  scheduledAt: Date | string,
  now: Date | string,
): boolean;
export function toDate(value: unknown): Date;
export function getSiteUrl(): string;
