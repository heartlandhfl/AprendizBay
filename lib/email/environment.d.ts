import type { EmailMessage, EmailProvider, EmailResult } from "@/lib/email/provider";

export type EmailEnvironment = "development" | "staging" | "production";

export function resolveEmailEnv(): EmailEnvironment;

export function resolveJetSendTransmissionApiUrl(): string;

export function applyEmailEnvironmentGuards(input: EmailMessage): {
  message: EmailMessage;
  skipped?: EmailResult;
};

export function wrapEmailProviderWithEnvironmentGuards(provider: EmailProvider): EmailProvider;
