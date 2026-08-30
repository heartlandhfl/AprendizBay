import assert from "node:assert/strict";
import { parseCookieConsent } from "./cookie-consent";

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
