import { resolveEmailEnv } from "@/lib/email/environment.js";
import { isJetSendConfigured, readJetSendApiKey } from "@/lib/jetsend/config";

export interface EmailDiagnosticsPayload {
  emailProvider: string | null;
  jetsendConfigured: boolean;
  jetsendKeyPrefix: string | null;
  resolvedEmailEnv: ReturnType<typeof resolveEmailEnv>;
  vercelEnv: string | null;
  runtime: string;
}

function readJetSendKeyPrefix(): string | null {
  const key = readJetSendApiKey();
  if (!key) {
    return null;
  }
  return key.slice(0, 4);
}

export function buildEmailDiagnosticsPayload(): EmailDiagnosticsPayload {
  return {
    emailProvider: process.env.EMAIL_PROVIDER ?? null,
    jetsendConfigured: isJetSendConfigured(),
    jetsendKeyPrefix: readJetSendKeyPrefix(),
    resolvedEmailEnv: resolveEmailEnv(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    runtime: process.env.APRENDIZ_RUNTIME ?? "next",
  };
}
