"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";
import SearchFilters, {
  DEFAULT_FILTERS,
  type SearchFilterState,
} from "@/components/search/SearchFilters";
import TutorCard from "@/components/search/TutorCard";
import { PRICE_RANGES, type Tutor } from "@/lib/mock-tutors";
import { fetchVerifiedTutors } from "@/lib/tutors/client";

function applyClientFilters(tutors: Tutor[], filters: SearchFilterState) {
  const priceRange = PRICE_RANGES[filters.priceRangeIndex];

  return tutors
    .filter((tutor) => {
      if (
        filters.subject !== "Todas as matérias" &&
        tutor.subject !== filters.subject
      ) {
        return false;
      }

      const priceToCheck =
        filters.lessonType === "coletivo"
          ? tutor.collectivePrice
          : tutor.individualPrice;

      if (priceToCheck < priceRange.min || priceToCheck > priceRange.max) {
        return false;
      }

      if (
        filters.modality !== "todos" &&
        tutor.modality !== filters.modality &&
        tutor.modality !== "ambos"
      ) {
        return false;
      }

      if (filters.lessonType !== "todos") {
        const lessonType = filters.lessonType;
        if (!tutor.lessonTypes.includes(lessonType)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => b.rating - a.rating);
}

export default function SearchResults() {
  const [filters, setFilters] = useState<SearchFilterState>(DEFAULT_FILTERS);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTutors() {
      setLoading(true);

      try {
        const fetchedTutors = await fetchVerifiedTutors({
          subject: filters.subject,
          modality: filters.modality,
        });

        if (!cancelled) {
          setTutors(fetchedTutors);
        }
      } catch (error) {
        console.error("[Aprendiz Bay] Erro ao buscar tutores:", error);
        if (!cancelled) {
          setTutors([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTutors();

    return () => {
      cancelled = true;
    };
  }, [filters.subject, filters.modality]);

  const results = useMemo(
    () => applyClientFilters(tutors, filters),
    [filters, tutors],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Resultados da Busca
        </h1>
        <p className="mt-2 text-muted-foreground">
          Encontre o professor ideal e economize com{" "}
          <span className="inline-flex items-center gap-1 font-medium text-secondary-600">
            <Users className="h-4 w-4" aria-hidden="true" />
            aulas coletivas
          </span>
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        <SearchFilters
          filters={filters}
          onChange={setFilters}
          resultCount={results.length}
        />

        <section>
          <div className="mb-6 hidden items-center justify-between lg:flex">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {results.length}
              </span>{" "}
              professor{results.length !== 1 ? "es" : ""} encontrado
              {results.length !== 1 ? "s" : ""}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-50 px-3 py-1 text-xs font-semibold text-secondary-700 ring-1 ring-secondary-200">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Aulas coletivas a partir de R$ 18/h
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-muted/40">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
              <span className="sr-only">Carregando professores...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
              {results.map((tutor) => (
                <TutorCard key={tutor.id} tutor={tutor} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-muted/60 px-6 py-16 text-center">
              <p className="text-lg font-semibold text-foreground">
                Nenhum professor encontrado
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Tente ajustar os filtros para ver mais resultados.
              </p>
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-6 rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
