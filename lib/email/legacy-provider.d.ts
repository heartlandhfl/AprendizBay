export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  provider?: string;
  providerMessageId?: string;
}

export function sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
