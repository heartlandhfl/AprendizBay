import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import TutorHeader from "@/components/tutor/TutorHeader";
import TutorAbout from "@/components/tutor/TutorAbout";
import TutorTeaching from "@/components/tutor/TutorTeaching";
import TutorPricing from "@/components/tutor/TutorPricing";
import TutorAvailabilitySection from "@/components/tutor/TutorAvailabilitySection";
import TutorReviews from "@/components/tutor/TutorReviews";
import TutorCollectiveClasses from "@/components/tutor/TutorCollectiveClasses";
import TutorStickyActions from "@/components/tutor/TutorStickyActions";
import ProfileViewTracker from "@/components/observability/ProfileViewTracker";
import BookingWidget from "@/components/tutor/BookingWidget";
import SendMessageButton from "@/components/conversations/SendMessageButton";
import TutorCatalogProblem from "@/components/catalog/TutorCatalogProblem";
import { INDEX_FOLLOW_ROBOTS, NOINDEX_FOLLOW_ROBOTS } from "@/lib/seo/robots-policy";
import { buildTutorPersonJsonLd } from "@/lib/seo/tutor-jsonld";
import { isCatalogProblem, tutorsForPublicPages } from "@/lib/tutors/catalog";
import { fetchAllTutorIds, fetchTutorProfile } from "@/lib/tutors/server";
import { offersLessonType } from "@/lib/tutors/profile-display";

interface TutorPageProps {
  params: { id: string };
}

export const dynamicParams = true;

export async function generateStaticParams() {
  const catalog = await fetchAllTutorIds();
  return tutorsForPublicPages(catalog).map((id) => ({ id }));
}

export async function generateMetadata({ params }: TutorPageProps): Promise<Metadata> {
  const result = await fetchTutorProfile(params.id);

  if (isCatalogProblem(result.state)) {
    return {
      title: "Professor — Aprendiz Bay",
      robots: NOINDEX_FOLLOW_ROBOTS,
    };
  }

  if (!result.tutor) {
    return {
      title: "Professor não encontrado — Aprendiz Bay",
      robots: NOINDEX_FOLLOW_ROBOTS,
    };
  }

  const tutor = result.tutor;

  const description =
    tutor.headline?.trim() ||
    tutor.about?.trim() ||
    tutor.bio?.trim() ||
    `Conheça ${tutor.name}, professor de ${tutor.subject} na Aprendiz Bay.`;

  return {
    title: `${tutor.name} — ${tutor.subject} | Aprendiz Bay`,
    description,
    alternates: {
      canonical: `/tutor/${tutor.id}`,
    },
    robots: INDEX_FOLLOW_ROBOTS,
    openGraph: {
      title: `${tutor.name} — ${tutor.subject} | Aprendiz Bay`,
      description,
      locale: "pt_BR",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${tutor.name} — ${tutor.subject} | Aprendiz Bay`,
      description,
    },
  };
}

export default async function TutorPage({ params }: TutorPageProps) {
  const result = await fetchTutorProfile(params.id);

  if (isCatalogProblem(result.state)) {
    return <TutorCatalogProblem kind={result.state} scope="profile" />;
  }

  if (!result.tutor) {
    notFound();
  }

  const tutor = result.tutor;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <ProfileViewTracker tutorId={tutor.id} subject={tutor.subject} />
      <JsonLd data={buildTutorPersonJsonLd(tutor)} />
      <Link
        href="/search"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar aos resultados
      </Link>

      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:items-start">
        <div className="space-y-6 sm:space-y-8">
          <TutorHeader tutor={tutor} />
          <TutorAbout tutor={tutor} />
          <TutorTeaching tutor={tutor} />
          <TutorPricing tutor={tutor} />
          <TutorAvailabilitySection tutorId={tutor.id} />
          <TutorCollectiveClasses tutor={tutor} />
          <TutorReviews
            tutorId={tutor.id}
            initialRating={tutor.rating}
            initialReviewCount={tutor.reviewCount}
          />
        </div>

        <div className="mt-8 space-y-4 lg:mt-0">
          <SendMessageButton tutorId={tutor.id} tutorName={tutor.name} />
          <BookingWidget tutor={tutor} />
        </div>
      </div>

      <TutorStickyActions showJoinClass={offersLessonType(tutor, "coletivo")} />
    </div>
  );
}
