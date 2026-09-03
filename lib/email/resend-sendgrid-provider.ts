import { JetSendEmailProvider } from "@/lib/email/jetsend-provider";
import type { EmailMessage, EmailProvider, EmailResult } from "@/lib/email/provider";
import { isJetSendConfigured } from "@/lib/jetsend/config";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { wrapEmailProviderWithEnvironmentGuards } = require("./environment.js") as {
  wrapEmailProviderWithEnvironmentGuards(provider: EmailProvider): EmailProvider;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const legacyProvider = require("./legacy-provider.js") as {
  sendEmail(input: {
    to: string;
    subject: string;
    text: string;
    html: string;
    from?: string;
  }): Promise<EmailResult>;
  resolveFromAddress(): string;
};

export class ResendSendGridEmailProvider implements EmailProvider {
  async send(input: EmailMessage): Promise<EmailResult> {
    return legacyProvider.sendEmail({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      from: input.from ?? legacyProvider.resolveFromAddress(),
    });
  }
}

let activeProvider: EmailProvider | null = null;

function resolveConfiguredEmailProvider(): EmailProvider {
  const configured = String(process.env.EMAIL_PROVIDER ?? "")
    .trim()
    .toLowerCase();

  if (configured === "jetsend" && isJetSendConfigured()) {
    return new JetSendEmailProvider();
  }

  return new ResendSendGridEmailProvider();
}

export function getActiveEmailProvider(): EmailProvider {
  if (!activeProvider) {
    activeProvider = wrapEmailProviderWithEnvironmentGuards(resolveConfiguredEmailProvider());
  }
  return activeProvider;
}

export function setActiveEmailProvider(provider: EmailProvider | null): void {
  activeProvider = provider;
}
