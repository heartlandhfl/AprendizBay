import type { PaymentStatus } from "@/lib/bookings/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/bookings/types";

const STATUS_STYLES: Record<PaymentStatus, string> = {
  unpaid: "bg-muted text-muted-foreground ring-border",
  awaiting_payment: "bg-amber-50 text-amber-800 ring-amber-200",
  paid: "bg-primary-50 text-primary-800 ring-primary-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  expired: "bg-orange-50 text-orange-800 ring-orange-200",
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export default function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_STYLES[status]}`}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
