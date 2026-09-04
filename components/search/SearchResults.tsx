"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Users } from "lucide-react";
import CollectiveClassCard from "@/components/hubs/CollectiveClassCard";
import SearchFilters, {
  DEFAULT_FILTERS,
  type SearchFilterState,
} from "@/components/search/SearchFilters";
import TutorCard from "@/components/search/TutorCard";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import CatalogLoadState from "@/components/catalog/CatalogLoadState";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchOpenCollectiveHubs } from "@/lib/hubs/service";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import type { Tutor } from "@/lib/mock-tutors";
import { PRICE_RANGES } from "@/lib/tutors/catalog-options";
import { isCatalogProblem, type TutorCatalogState } from "@/lib/tutors/catalog";
import { fetchVerifiedTutors } from "@/lib/tutors/client";
import { subscribeToStudentLearningProfile } from "@/lib/student-dashboard/preferences";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";
import {
  applyTutorSearchFilters,
  firestoreSearchConstraints,
  SEARCH_LANDING_TITLE,
  searchEmptyState,
} from "@/lib/tutors/search";
import {
  broadenSearchFilters,
  buildSearchHref,
  hasActiveSearchCriteria,
  hasExplicitSearchParams,
  mergeProfileDefaults,
  parseSearchFiltersFromParams,
  serializeSearchFilters,
  type SearchPageParams,
} from "@/lib/tutors/search-params";

function enrichHub(hub: CollectiveHubLive, tutors: Tutor[]): CollectiveHubLive {
  const tutor = tutors.find((item) => item.id === hub.tutorId);
  if (!tutor) {
    return hub;
  }

  return {
    ...hub,
    subject: hub.subject || tutor.subject,
    tutorName: hub.tutorName || tutor.name,
    individualPrice: hub.individualPrice || tutor.individualPrice,
  };
}

function hubMatchesFilters(hub: CollectiveHubLive, filters: SearchFilterState): boolean {
  const priceRange = PRICE_RANGES[filters.priceRangeIndex];

  if (filters.subject !== "Todas as matérias" && hub.subject !== filters.subject) {
    return false;
  }

  if (hub.currentPrice < priceRange.min || hub.currentPrice > priceRange.max) {
    return false;
  }

  if (filters.modality !== "todos" && hub.modality !== filters.modality) {
    return false;
  }

  return hub.status === "open" && hub.confirmedStudents < hub.maxStudents;
}

interface SearchResultsProps {
  initialSearchParams?: SearchPageParams;
}

export default function SearchResults({ initialSearchParams = {} }: SearchResultsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const liveSearchParams = useSearchParams();
  const { user, userDoc } = useAuth();
  const [learningProfile, setLearningProfile] = useState<StudentLearningProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [filters, setFilters] = useState<SearchFilterState>(() =>
    parseSearchFiltersFromParams(initialSearchParams),
  );
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [hubs, setHubs] = useState<CollectiveHubLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogState, setCatalogState] = useState<TutorCatalogState>("ok");
  const [reloadToken, setReloadToken] = useState(0);
  const initializedProfileDefaultsRef = useRef(false);
  const explicitUrlFiltersRef = useRef(hasExplicitSearchParams(initialSearchParams));

  const firestoreFilters = useMemo(() => firestoreSearchConstraints(filters), [filters]);
  const searchReturnTo = useMemo(() => buildSearchHref(filters), [filters]);

  useEffect(() => {
    if (!user || userDoc?.role !== "student") {
      setLearningProfile(null);
      setProfileLoaded(true);
      return;
    }

    return subscribeToStudentLearningProfile(user.uid, (profile) => {
      setLearningProfile(profile);
      setProfileLoaded(true);
    });
  }, [user, userDoc?.role]);

  const searchParamsKey = liveSearchParams.toString();

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    explicitUrlFiltersRef.current = hasExplicitSearchParams(
      Object.fromEntries(params.entries()),
    );
    setFilters(parseSearchFiltersFromParams(params));
  }, [searchParamsKey]);

  useEffect(() => {
    if (!profileLoaded || initializedProfileDefaultsRef.current || explicitUrlFiltersRef.current) {
      return;
    }

    initializedProfileDefaultsRef.current = true;
    const withProfile = mergeProfileDefaults(DEFAULT_FILTERS, learningProfile);
    setFilters(withProfile);
    router.replace(buildSearchHref(withProfile), { scroll: false });
  }, [learningProfile, profileLoaded, router]);

  const updateFilters = useCallback(
    (nextFilters: SearchFilterState) => {
      explicitUrlFiltersRef.current = true;
      initializedProfileDefaultsRef.current = true;
      setFilters(nextFilters);

      const query = serializeSearchFilters(nextFilters).toString();
      const nextUrl = query ? `${pathname}?${query}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      setLoading(true);

      try {
        const [tutorCatalog, hubCatalog] = await Promise.all([
          fetchVerifiedTutors(firestoreFilters),
          fetchOpenCollectiveHubs(),
        ]);

        if (cancelled) {
          return;
        }

        if (isCatalogProblem(tutorCatalog.state) || isCatalogProblem(hubCatalog.state)) {
          setCatalogState(
            tutorCatalog.state === "unavailable" || hubCatalog.state === "unavailable"
              ? "unavailable"
              : "error",
          );
          setTutors([]);
          setHubs([]);
          return;
        }

        setCatalogState(tutorCatalog.state === "ok" || hubCatalog.state === "ok" ? "ok" : "empty");
        setTutors(tutorCatalog.items);
        setHubs(hubCatalog.items.map((hub) => enrichHub(hub, tutorCatalog.items)));
      } catch (error) {
        console.error("[Aprendiz Bay] Erro ao buscar tutores:", error);
        if (!cancelled) {
          setCatalogState("error");
          setTutors([]);
          setHubs([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadResults();

    return () => {
      cancelled = true;
    };
  }, [firestoreFilters, reloadToken]);

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.search, {
      subject: filters.subject,
      city: filters.city,
      modality: filters.modality,
      lesson_type: filters.lessonType,
      source: "results",
    });
  }, [filters.city, filters.lessonType, filters.modality, filters.subject]);

  const tutorResults = useMemo(
    () => applyTutorSearchFilters(tutors, filters),
    [filters, tutors],
  );

  const classResults = useMemo(() => {
    if (filters.lessonType === "individual") {
      return [];
    }

    const tutorsForHubs = applyTutorSearchFilters(tutors, {
      ...filters,
      lessonType: filters.lessonType === "coletivo" ? "coletivo" : "todos",
      priceRangeIndex: DEFAULT_FILTERS.priceRangeIndex,
      modality: DEFAULT_FILTERS.modality,
    });
    const eligibleTutorIds = new Set(tutorsForHubs.map((tutor) => tutor.id));

    return hubs.filter(
      (hub) => eligibleTutorIds.has(hub.tutorId) && hubMatchesFilters(hub, filters),
    );
  }, [filters, hubs, tutors]);

  const showTutors = filters.lessonType !== "coletivo";
  const visibleTutors = showTutors ? tutorResults : [];
  const resultCount = visibleTutors.length + classResults.length;
  const emptyCopy = searchEmptyState(filters);
  const landingView = !hasActiveSearchCriteria(filters);
  const pageTitle = landingView ? SEARCH_LANDING_TITLE : "Resultados da Busca";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{pageTitle}</h1>
        <p className="mt-2 text-muted-foreground">
          {landingView
            ? "Use os filtros para encontrar professores verificados e turmas coletivas que combinem com você."
            : (
              <>
                Encontre professores e{" "}
                <span className="inline-flex items-center gap-1 font-medium text-secondary-600">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  aulas coletivas
                </span>{" "}
                no mesmo lugar.
              </>
            )}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        <SearchFilters
          filters={filters}
          onChange={updateFilters}
          resultCount={resultCount}
        />

        <section>
          <div className="mb-6 hidden items-center justify-between lg:flex">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{resultCount}</span>{" "}
              resultado{resultCount !== 1 ? "s" : ""}
              {visibleTutors.length > 0 || classResults.length > 0 ? (
                <>
                  {" "}
                  ({visibleTutors.length} professor
                  {visibleTutors.length !== 1 ? "es" : ""}
                  {classResults.length > 0
                    ? ` · ${classResults.length} turma${classResults.length !== 1 ? "s" : ""} coletiva${classResults.length !== 1 ? "s" : ""}`
                    : ""}
                  )
                </>
              ) : null}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-50 px-3 py-1 text-xs font-semibold text-secondary-700 ring-1 ring-secondary-200">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Aula individual e aula coletiva
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-muted/40">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
              <span className="sr-only">Carregando professores e turmas...</span>
            </div>
          ) : isCatalogProblem(catalogState) ? (
            <CatalogLoadState
              kind={catalogState}
              onRetry={() => setReloadToken((token) => token + 1)}
            />
          ) : resultCount > 0 ? (
            <div className="space-y-8">
              {classResults.length > 0 ? (
                <div>
                  <h2 className="mb-4 text-lg font-bold text-foreground">Aulas coletivas</h2>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
                    {classResults.map((hub) => (
                      <CollectiveClassCard key={hub.id} hub={hub} />
                    ))}
                  </div>
                </div>
              ) : null}

              {visibleTutors.length > 0 ? (
                <div>
                  {classResults.length > 0 ? (
                    <h2 className="mb-4 text-lg font-bold text-foreground">
                      Aulas individuais e professores
                    </h2>
                  ) : null}
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
                    {visibleTutors.map((tutor) => (
                      <TutorCard
                        key={tutor.id}
                        tutor={tutor}
                        returnTo={searchReturnTo}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl bg-muted/60 px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-foreground">{emptyCopy.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{emptyCopy.description}</p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => updateFilters(broadenSearchFilters(filters))}
                  className="rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  Ampliar busca
                </button>
                <button
                  type="button"
                  onClick={() => updateFilters(DEFAULT_FILTERS)}
                  className="rounded-2xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Limpar filtros
                </button>
                <Link
                  href="/professores"
                  className="rounded-2xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Ver páginas por disciplina e cidade
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
