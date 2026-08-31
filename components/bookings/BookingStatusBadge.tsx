import type { BookingStatus } from "@/lib/bookings/types";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  confirmed: "bg-primary-50 text-primary-800 ring-primary-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export default function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_STYLES[status]}`}
    >
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}
