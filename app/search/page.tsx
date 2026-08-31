import type { Metadata } from "next";
import SearchResults from "@/components/search/SearchResults";
import { INDEX_FOLLOW_ROBOTS, NOINDEX_FOLLOW_ROBOTS } from "@/lib/seo/robots-policy";

interface SearchPageProps {
  searchParams: { q?: string; subject?: string; modality?: string; city?: string };
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const hasFilters = Boolean(
    searchParams.q?.trim() ||
      searchParams.subject?.trim() ||
      searchParams.modality?.trim() ||
      searchParams.city?.trim(),
  );

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
  return (
    <SearchResults
      initialQuery={searchParams.q ?? searchParams.subject ?? ""}
      initialModality={searchParams.modality}
      initialCity={searchParams.city}
    />
  );
}
