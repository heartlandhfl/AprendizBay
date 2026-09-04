import { captureServerException } from "@/lib/observability/sentry-server";

export type CriticalServerArea =
  | "payment"
  | "webhook"
  | "booking"
  | "classroom"
  | "review"
  | "facilitator_commission";

type SafeLogValue = string | number | boolean | null;

function sanitizeContext(
  context?: Record<string, SafeLogValue | undefined>,
): Record<string, SafeLogValue> {
  if (!context) {
    return {};
  }

  const safe: Record<string, SafeLogValue> = {};
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) {
      safe[key] = value;
    }
  }
  return safe;
}

/** Structured server-side failure log. Never include tokens, emails, or payment payloads. */
export function logCriticalServerFailure(
  area: CriticalServerArea,
  message: string,
  context?: Record<string, SafeLogValue | undefined>,
  options: { capture?: boolean } = {},
): void {
  const safeContext = sanitizeContext(context);
  console.error(`[Aprendiz Bay][${area}] ${message}`, safeContext);

  if (options.capture) {
    captureServerException(new Error(`[${area}] ${message}`));
  }
}
