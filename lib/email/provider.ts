export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
  /** Correlates JetSend webhook events back to emailOutbox/{emailOutboxId}. */
  emailOutboxId?: string;
}

export interface EmailResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  provider?: "jetsend" | "resend" | "sendgrid";
  providerMessageId?: string;
}

export interface EmailProvider {
  send(input: EmailMessage): Promise<EmailResult>;
}
