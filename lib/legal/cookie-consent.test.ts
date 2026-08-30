import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COOKIE_PREFERENCES_EVENT,
  COOKIE_PREFERENCES_OPEN_EVENT,
} from "./constants";
import { parseCookieConsent } from "./cookie-consent";

describe("cookie consent", () => {
  it("keeps write and open events distinct", () => {
    assert.notEqual(COOKIE_PREFERENCES_EVENT, COOKIE_PREFERENCES_OPEN_EVENT);
  });

  it("rejects incomplete stored decisions", () => {
    assert.equal(parseCookieConsent(null), null);
    assert.equal(parseCookieConsent({ necessary: true, optional: true }), null);
  });

  it("parses a valid decision", () => {
    assert.deepEqual(
      parseCookieConsent({
        necessary: true,
        optional: false,
        decidedAt: "2026-08-30T00:00:00.000Z",
      }),
      {
        necessary: true,
        optional: false,
        decidedAt: "2026-08-30T00:00:00.000Z",
      },
    );
  });
});
