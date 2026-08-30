import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import TutorHeader from "@/components/tutor/TutorHeader";
import TutorAbout from "@/components/tutor/TutorAbout";
import BookingWidget from "@/components/tutor/BookingWidget";
import SendMessageButton from "@/components/conversations/SendMessageButton";
import { buildTutorPersonJsonLd } from "@/lib/seo/tutor-jsonld";
import { fetchAllTutorIds, fetchTutorProfile } from "@/lib/tutors/server";

interface TutorPageProps {
  params: { id: string };
}

export async function generateStaticParams() {
  const ids = await fetchAllTutorIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: TutorPageProps): Promise<Metadata> {
  const tutor = await fetchTutorProfile(params.id);

  if (!tutor) {
    return { title: "Professor não encontrado — Aprendiz Bay" };
  }

  return {
    title: `${tutor.name} — ${tutor.subject} | Aprendiz Bay`,
    description: tutor.headline,
  };
}

export default async function TutorPage({ params }: TutorPageProps) {
  const tutor = await fetchTutorProfile(params.id);

  if (!tutor) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd data={buildTutorPersonJsonLd(tutor)} />
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

        <div className="mt-8 space-y-4 lg:mt-0">
          <SendMessageButton tutorId={tutor.id} tutorName={tutor.name} />
          <BookingWidget tutor={tutor} />
        </div>
      </div>
    </div>
  );
}
