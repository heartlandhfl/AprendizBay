import { LESSON_STATUS_LABELS, type LessonStatus } from "@/lib/lessons/status";

const STATUS_STYLES: Record<LessonStatus, string> = {
  scheduled: "bg-slate-50 text-slate-800 ring-slate-200",
  payment_pending: "bg-amber-50 text-amber-800 ring-amber-200",
  confirmed: "bg-primary-50 text-primary-800 ring-primary-200",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
};

interface LessonStatusBadgeProps {
  status: LessonStatus;
}

export default function LessonStatusBadge({ status }: LessonStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_STYLES[status]}`}
    >
      {LESSON_STATUS_LABELS[status]}
    </span>
  );
}
