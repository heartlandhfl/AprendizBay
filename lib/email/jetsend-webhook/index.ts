export { authorizeJetSendWebhook, buildJetSendBasicAuthorizationHeader } from "@/lib/email/jetsend-webhook/auth";
export { createFirestoreEmailDeliveryEventStore } from "@/lib/email/jetsend-webhook/firestore";
export {
  EMAIL_DELIVERY_EVENTS_COLLECTION,
  WEBHOOK_ALREADY_PROCESSED_MESSAGE,
  WEBHOOK_INVALID_MESSAGE,
  WEBHOOK_RECEIVED_MESSAGE,
  WEBHOOK_UNAUTHORIZED_MESSAGE,
  WEBHOOK_UNCONFIGURED_MESSAGE,
  WEBHOOK_UNKNOWN_MESSAGE_MESSAGE,
} from "@/lib/email/jetsend-webhook/messages";
export {
  parseJetSendWebhookPayload,
  type ParsedJetSendWebhookEvent,
} from "@/lib/email/jetsend-webhook/parse";
export {
  createMemoryEmailDeliveryEventStore,
  processJetSendWebhookEvent,
  processJetSendWebhookEvents,
  type EmailDeliveryEventRecord,
  type EmailDeliveryEventStore,
  type ProcessJetSendWebhookDeps,
  type ProcessJetSendWebhookResult,
} from "@/lib/email/jetsend-webhook/process";
