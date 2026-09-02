export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
}

export interface EmailResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  provider?: "resend" | "sendgrid";
}

export interface EmailProvider {
  send(input: EmailMessage): Promise<EmailResult>;
}
