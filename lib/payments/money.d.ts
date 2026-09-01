export type MoneyParseStatus = "ok" | "missing" | "malformed";

export type MoneyParseResult =
  | { status: "ok"; cents: number }
  | { status: "missing" }
  | { status: "malformed" };

export type PaymentAmountMatchReason =
  | "match"
  | "too_low"
  | "too_high"
  | "missing"
  | "malformed"
  | "invalid_expected";

export interface PaymentAmountComparison {
  ok: boolean;
  reason: PaymentAmountMatchReason;
  expectedCents: number | null;
  paidCents: number | null;
}

export interface AuthoritativeLessonPrice {
  price: number;
  priceCents: number;
}

export interface BookingFeeSplitCents {
  platformFee: number;
  tutorAmount: number;
  platformFeeCents: number;
  tutorAmountCents: number;
  priceCents: number;
}

export function brlToCents(value: unknown): number | null;
export function centsToBrl(cents: number): number | null;
export function parseMoneyToCents(value: unknown): MoneyParseResult;
export function comparePaidAmountToExpected(
  paidValue: unknown,
  expectedBrl: unknown,
): PaymentAmountComparison;
export function splitBookingPriceFromCents(
  priceCents: number,
  percent?: unknown,
): BookingFeeSplitCents;
export function authoritativeLessonPrice(
  rawPrice: unknown,
): AuthoritativeLessonPrice | null;
