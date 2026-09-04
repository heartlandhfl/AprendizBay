import type { Metadata } from "next";
import SearchResults from "@/components/search/SearchResults";
import { INDEX_FOLLOW_ROBOTS, NOINDEX_FOLLOW_ROBOTS } from "@/lib/seo/robots-policy";
import { hasExplicitSearchParams } from "@/lib/tutors/search-params";

interface SearchPageProps {
  searchParams: {
    q?: string;
    subject?: string;
    modality?: string;
    city?: string;
    level?: string;
    price?: string;
    available?: string;
    lessonType?: string;
    minRating?: string;
    verified?: string;
    experience?: string;
  };
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const hasFilters = hasExplicitSearchParams(searchParams);

  return {
    title: "Buscar Professores — Aprendiz Bay",
    description:
      "Encontre tutores verificados para aulas individuais ou coletivas. Compare preços e economize aprendendo em grupo.",
    alternates: {
      canonical: "/search",
    },
    robots: hasFilters ? NOINDEX_FOLLOW_ROBOTS : INDEX_FOLLOW_ROBOTS,
  };
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return <SearchResults initialSearchParams={searchParams} />;
}
