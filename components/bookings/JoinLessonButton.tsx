import Link from "next/link";
import { Video } from "lucide-react";

interface JoinLessonButtonProps {
  meetingUrl: string;
}

export default function JoinLessonButton({ meetingUrl }: JoinLessonButtonProps) {
  return (
    <Link
      href={meetingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
    >
      <Video className="h-4 w-4" aria-hidden="true" />
      Entrar na aula
    </Link>
  );
}
