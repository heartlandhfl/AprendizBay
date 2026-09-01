"use strict";

/**
 * Integer-cent helpers for BRL. Avoids floating-point comparison of money.
 * 1 BRL = 100 cents. Stored booking.price stays a 2-decimal BRL number.
 */

function brlToCents(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    return Math.round(value * 100);
  }

  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".");
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Math.round(parsed * 100);
  }

  return null;
}

function centsToBrl(cents) {
  if (!Number.isInteger(cents) || !Number.isFinite(cents)) {
    return null;
  }
  return Math.round(cents) / 100;
}

function parseMoneyToCents(value) {
  if (value == null || value === "") {
    return { status: "missing" };
  }

  if (typeof value === "object") {
    return { status: "malformed" };
  }

  const cents = brlToCents(value);
  if (cents == null || cents < 0) {
    return { status: "malformed" };
  }

  return { status: "ok", cents };
}

/**
 * Exact-match policy: paid cents must equal expected cents.
 * Too low, too high, missing, and malformed all fail closed.
 */
function comparePaidAmountToExpected(paidValue, expectedBrl) {
  const expected = parseMoneyToCents(expectedBrl);
  if (expected.status !== "ok" || expected.cents <= 0) {
    return {
      ok: false,
      reason: "invalid_expected",
      expectedCents: expected.status === "ok" ? expected.cents : null,
      paidCents: null,
    };
  }

  const paid = parseMoneyToCents(paidValue);
  if (paid.status === "missing") {
    return {
      ok: false,
      reason: "missing",
      expectedCents: expected.cents,
      paidCents: null,
    };
  }
  if (paid.status === "malformed") {
    return {
      ok: false,
      reason: "malformed",
      expectedCents: expected.cents,
      paidCents: null,
    };
  }

  if (paid.cents < expected.cents) {
    return {
      ok: false,
      reason: "too_low",
      expectedCents: expected.cents,
      paidCents: paid.cents,
    };
  }
  if (paid.cents > expected.cents) {
    return {
      ok: false,
      reason: "too_high",
      expectedCents: expected.cents,
      paidCents: paid.cents,
    };
  }

  return {
    ok: true,
    reason: "match",
    expectedCents: expected.cents,
    paidCents: paid.cents,
  };
}

function splitBookingPriceFromCents(priceCents, percent) {
  const safePriceCents =
    Number.isInteger(priceCents) && priceCents > 0 ? priceCents : 0;
  const parsed =
    typeof percent === "number" ? percent : Number.parseFloat(String(percent ?? ""));
  const safePercent =
    Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 10;
  const platformFeeCents = Math.round((safePriceCents * safePercent) / 100);
  const tutorAmountCents = safePriceCents - platformFeeCents;
  return {
    platformFee: centsToBrl(platformFeeCents) ?? 0,
    tutorAmount: centsToBrl(tutorAmountCents) ?? 0,
    platformFeeCents,
    tutorAmountCents,
    priceCents: safePriceCents,
  };
}

function authoritativeLessonPrice(rawPrice) {
  const parsed = parseMoneyToCents(rawPrice);
  if (parsed.status !== "ok" || parsed.cents <= 0) {
    return null;
  }
  const brl = centsToBrl(parsed.cents);
  if (brl == null || brl <= 0) {
    return null;
  }
  return { price: brl, priceCents: parsed.cents };
}

module.exports = {
  authoritativeLessonPrice,
  brlToCents,
  centsToBrl,
  comparePaidAmountToExpected,
  parseMoneyToCents,
  splitBookingPriceFromCents,
};
