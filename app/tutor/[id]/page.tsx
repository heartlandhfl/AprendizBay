import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TutorHeader from "@/components/tutor/TutorHeader";
import TutorAbout from "@/components/tutor/TutorAbout";
import BookingWidget from "@/components/tutor/BookingWidget";
import { getAllTutorIds, getTutorProfile } from "@/lib/tutor-profiles";

interface TutorPageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return getAllTutorIds().map((id) => ({ id }));
}

export function generateMetadata({ params }: TutorPageProps): Metadata {
  const tutor = getTutorProfile(params.id);

  if (!tutor) {
    return { title: "Professor não encontrado — Aprendiz Bay" };
  }

  return {
    title: `${tutor.name} — ${tutor.subject} | Aprendiz Bay`,
    description: tutor.headline,
  };
}

export default function TutorPage({ params }: TutorPageProps) {
  const tutor = getTutorProfile(params.id);

  if (!tutor) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/search"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar aos resultados
      </Link>

      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:items-start">
        <div className="space-y-8">
          <TutorHeader tutor={tutor} />
          <TutorAbout tutor={tutor} />
        </div>

        <div className="mt-8 lg:mt-0">
          <BookingWidget tutor={tutor} />
        </div>
      </div>
    </div>
  );
}
