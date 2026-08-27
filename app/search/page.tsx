import type { Metadata } from "next";
import SearchResults from "@/components/search/SearchResults";

export const metadata: Metadata = {
  title: "Buscar Professores — Aprendiz Bay",
  description:
    "Encontre tutores verificados para aulas individuais ou coletivas. Compare preços e economize aprendendo em grupo.",
};

export default function SearchPage() {
  return <SearchResults />;
}
