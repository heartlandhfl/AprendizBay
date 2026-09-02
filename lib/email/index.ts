export { EMAIL_EVENTS, type EmailEventName, type EmailEventPayloadMap } from "@/lib/email/events";
export type { EmailMessage, EmailProvider, EmailResult } from "@/lib/email/provider";
export {
  getActiveEmailProvider,
  ResendSendGridEmailProvider,
  setActiveEmailProvider,
} from "@/lib/email/resend-sendgrid-provider";
export { onEvent, onNewReviewEmail, type OnEmailEventDeps } from "@/lib/email/send";
export {
  buildEmailTemplate,
  buildNewReviewEmail,
  type EmailContent,
} from "@/lib/email/templates";
