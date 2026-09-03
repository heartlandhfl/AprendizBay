export { TRANSACTIONAL_EMAIL_MATRIX } from "@/lib/email/event-catalog";
export { EMAIL_EVENTS, type EmailEventName, type EmailEventPayloadMap } from "@/lib/email/events";
export type { EmailMessage, EmailProvider, EmailResult } from "@/lib/email/provider";
export {
  JetSendEmailError,
  JetSendEmailProvider,
  buildJetSendTransmissionRequest,
  isValidEmailAddress,
  parseFromAddress,
  resolveJetSendFromAddress,
} from "@/lib/email/jetsend-provider";
export {
  getActiveEmailProvider,
  ResendSendGridEmailProvider,
  setActiveEmailProvider,
} from "@/lib/email/resend-sendgrid-provider";
export { onEvent, onNewReviewEmail, type OnEmailEventDeps } from "@/lib/email/send";
export {
  EMAIL_OUTBOX_COLLECTION,
  createFirestoreEmailOutboxStore,
  enqueueAndDeliverTransactionalEmail,
  processDueOutboxEmails,
} from "@/lib/email/outbox";
export {
  buildEmailTemplate,
  buildNewReviewEmail,
  type EmailContent,
} from "@/lib/email/templates";
