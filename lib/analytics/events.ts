export const ANALYTICS_EVENTS = {
  signUp: "sign_up",
  search: "search",
  profileView: "profile_view",
  bookingStarted: "booking_started",
  paymentCompleted: "payment_completed",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsProps = Record<string, string | number | boolean>;
