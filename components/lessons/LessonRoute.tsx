"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LessonExperience from "@/components/lessons/LessonExperience";
import { useAuth } from "@/lib/auth/AuthContext";
import { lessonBackLink } from "@/lib/lessons/paths";

interface LessonRouteProps {
  bookingId?: string;
}

export default function LessonRoute({ bookingId }: LessonRouteProps) {
  const searchParams = useSearchParams();
  const { userDoc } = useAuth();
  const id = (bookingId || searchParams.get("aula") || "").trim();

  if (!id) {
    const back = lessonBackLink(userDoc?.role);
    return (
      <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
        <h1 className="text-xl font-bold text-foreground">Escolha uma aula</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Abra uma aula pelo seu painel para ver professor, aluno, horário e o link da reunião.
        </p>
        <Link
          href={back.href}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          {back.label}
        </Link>
      </div>
    );
  }

  return <LessonExperience bookingId={id} />;
}
