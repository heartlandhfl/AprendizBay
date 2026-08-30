import { BOOKING_FEE_LABELS } from "@/lib/bookings/types";
import { formatBookingPrice } from "@/lib/bookings/service";
import { resolveBookingFeeSplit } from "@/lib/payments/fees";

interface BookingPaymentSummaryProps {
  price: number;
  platformFee?: number;
  tutorAmount?: number;
  variant?: "student" | "tutor";
}

export default function BookingPaymentSummary({
  price,
  platformFee,
  tutorAmount,
  variant = "student",
}: BookingPaymentSummaryProps) {
  const split = resolveBookingFeeSplit({ price, platformFee, tutorAmount });

  return (
    <div className="rounded-2xl bg-muted/50 p-4 ring-1 ring-border/60">
      <p className="text-sm font-semibold text-foreground">Resumo do pagamento</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{BOOKING_FEE_LABELS.lesson}</dt>
          <dd className="font-medium text-foreground">{formatBookingPrice(price)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{BOOKING_FEE_LABELS.tutor}</dt>
          <dd className="font-medium text-foreground">{formatBookingPrice(split.tutorAmount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{BOOKING_FEE_LABELS.platform}</dt>
          <dd className="font-medium text-foreground">{formatBookingPrice(split.platformFee)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2">
          <dt className="font-semibold text-foreground">
            {variant === "tutor" ? "Você recebe" : BOOKING_FEE_LABELS.total}
          </dt>
          <dd className="font-semibold text-foreground">
            {formatBookingPrice(variant === "tutor" ? split.tutorAmount : price)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
