import {
  MESSAGE_COOLDOWN_MS,
  MESSAGE_RATE_MAX_PER_WINDOW,
  MESSAGE_RATE_WINDOW_MS,
} from "@/lib/conversations/types";

export interface MessageRateLimitState {
  lastSentAtMs: number;
  windowStartedAtMs: number;
  windowCount: number;
}

export type MessageRateLimitDecision =
  | {
      ok: true;
      next: MessageRateLimitState;
    }
  | {
      ok: false;
      reason: "cooldown" | "window";
      retryAfterMs: number;
    };

export function evaluateMessageRateLimit(
  state: MessageRateLimitState | null,
  nowMs: number,
): MessageRateLimitDecision {
  if (!state) {
    return {
      ok: true,
      next: {
        lastSentAtMs: nowMs,
        windowStartedAtMs: nowMs,
        windowCount: 1,
      },
    };
  }

  const cooldownRemaining = state.lastSentAtMs + MESSAGE_COOLDOWN_MS - nowMs;
  if (cooldownRemaining > 0) {
    return {
      ok: false,
      reason: "cooldown",
      retryAfterMs: cooldownRemaining,
    };
  }

  const windowExpired = nowMs >= state.windowStartedAtMs + MESSAGE_RATE_WINDOW_MS;
  if (windowExpired) {
    return {
      ok: true,
      next: {
        lastSentAtMs: nowMs,
        windowStartedAtMs: nowMs,
        windowCount: 1,
      },
    };
  }

  if (state.windowCount >= MESSAGE_RATE_MAX_PER_WINDOW) {
    return {
      ok: false,
      reason: "window",
      retryAfterMs: state.windowStartedAtMs + MESSAGE_RATE_WINDOW_MS - nowMs,
    };
  }

  return {
    ok: true,
    next: {
      lastSentAtMs: nowMs,
      windowStartedAtMs: state.windowStartedAtMs,
      windowCount: state.windowCount + 1,
    },
  };
}

export function rateLimitErrorMessage(decision: Extract<MessageRateLimitDecision, { ok: false }>): string {
  if (decision.reason === "cooldown") {
    return "Aguarde alguns segundos antes de enviar outra mensagem.";
  }

  return "Você enviou muitas mensagens em pouco tempo. Tente de novo em um minuto.";
}
