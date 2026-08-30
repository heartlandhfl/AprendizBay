import assert from "node:assert/strict";
import {
  COOKIE_PREFERENCES_EVENT,
  COOKIE_PREFERENCES_OPEN_EVENT,
} from "./constants";
import { parseCookieConsent } from "./cookie-consent";

assert.notEqual(COOKIE_PREFERENCES_EVENT, COOKIE_PREFERENCES_OPEN_EVENT);

assert.equal(parseCookieConsent(null), null);
assert.equal(parseCookieConsent({ necessary: true, optional: true }), null);
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

console.log("cookie-consent: ok");
