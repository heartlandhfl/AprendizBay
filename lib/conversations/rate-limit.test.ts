import { describe, expect, it } from "vitest";
import {
  MESSAGE_COOLDOWN_MS,
  MESSAGE_RATE_MAX_PER_WINDOW,
  MESSAGE_RATE_WINDOW_MS,
} from "./types";
import { evaluateMessageRateLimit, rateLimitErrorMessage } from "./rate-limit";

describe("evaluateMessageRateLimit", () => {
  it("allows the first message", () => {
    const decision = evaluateMessageRateLimit(null, 1_000);

    expect(decision).toEqual({
      ok: true,
      next: { lastSentAtMs: 1_000, windowStartedAtMs: 1_000, windowCount: 1 },
    });
  });

  it("blocks a send during the cooldown", () => {
    const decision = evaluateMessageRateLimit(
      { lastSentAtMs: 1_000, windowStartedAtMs: 1_000, windowCount: 1 },
      1_000 + MESSAGE_COOLDOWN_MS - 1,
    );

    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("cooldown");
      expect(rateLimitErrorMessage(decision)).toMatch(/Aguarde alguns segundos/);
    }
  });

  it("blocks a send after the per-window maximum", () => {
    const decision = evaluateMessageRateLimit(
      {
        lastSentAtMs: 1_000,
        windowStartedAtMs: 1_000,
        windowCount: MESSAGE_RATE_MAX_PER_WINDOW,
      },
      1_000 + MESSAGE_COOLDOWN_MS,
    );

    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("window");
      expect(rateLimitErrorMessage(decision)).toMatch(/muitas mensagens/);
    }
  });

  it("opens a new window after the previous window expires", () => {
    const now = 1_000 + MESSAGE_RATE_WINDOW_MS;
    const decision = evaluateMessageRateLimit(
      {
        lastSentAtMs: now - MESSAGE_COOLDOWN_MS,
        windowStartedAtMs: 1_000,
        windowCount: MESSAGE_RATE_MAX_PER_WINDOW,
      },
      now,
    );

    expect(decision).toEqual({
      ok: true,
      next: { lastSentAtMs: now, windowStartedAtMs: now, windowCount: 1 },
    });
  });
});
