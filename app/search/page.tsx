import type { Metadata } from "next";
import SearchResults from "@/components/search/SearchResults";

export const metadata: Metadata = {
  title: "Buscar Professores — Aprendiz Bay",
  description:
    "Encontre tutores verificados para aulas individuais ou coletivas. Compare preços e economize aprendendo em grupo.",
};

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; subject?: string; modality?: string; city?: string };
}) {
  return (
    <SearchResults
      initialQuery={searchParams.q ?? searchParams.subject ?? ""}
      initialModality={searchParams.modality}
      initialCity={searchParams.city}
    />
  );
}
