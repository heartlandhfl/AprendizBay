export const REFERRAL_COOKIE_NAME = "ab_referral_code";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function getFacilitatorCommissionRatePercent(): number {
  const raw = process.env.FACILITATOR_COMMISSION_PERCENT ?? "15";
  const parsed = Number.parseFloat(String(raw).trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return 15;
  }
  return parsed;
}

export function getCommissionRefundWindowDays(): number {
  const raw = process.env.FACILITATOR_COMMISSION_REFUND_WINDOW_DAYS ?? "7";
  const parsed = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 7;
  }
  return parsed;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
