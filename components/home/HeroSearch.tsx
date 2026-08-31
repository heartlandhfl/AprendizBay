"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Monitor, Search } from "lucide-react";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

const PLACEHOLDERS = ["Matemática", "Violão", "Programação", "Inglês", "Redação"];

type Modality = "online" | "presencial";

export default function HeroSearch() {
  const router = useRouter();
  const [modality, setModality] = useState<Modality>("online");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (query) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 2800);

    return () => clearInterval(interval);
  }, [query]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();

    trackEvent(ANALYTICS_EVENTS.search, {
      query: trimmed || "all",
      modality,
      source: "hero",
    });

    const params = new URLSearchParams();
    if (trimmed) {
      params.set("q", trimmed);
    }
    params.set("modality", modality);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form
        onSubmit={handleSearch}
        className="group relative rounded-3xl bg-surface p-2 shadow-soft-lg ring-1 ring-border/60 transition-all duration-300 hover:shadow-[0_12px_40px_-8px_rgba(6,95,70,0.18)] hover:ring-primary-200/80 focus-within:shadow-[0_12px_40px_-8px_rgba(6,95,70,0.18)] focus-within:ring-primary-300"
      >
        <div className="mb-2 flex justify-center px-2 pt-1 sm:px-3">
          <div
            className="inline-flex rounded-2xl bg-muted p-1"
            role="group"
            aria-label="Modalidade da aula"
          >
            <button
              type="button"
              onClick={() => setModality("online")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                modality === "online"
                  ? "bg-surface text-primary-700 shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={modality === "online"}
            >
              <Monitor className="h-4 w-4" aria-hidden="true" />
              Online
            </button>
            <button
              type="button"
              onClick={() => setModality("presencial")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                modality === "presencial"
                  ? "bg-surface text-primary-700 shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={modality === "presencial"}
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Presencial
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-500 transition-colors group-focus-within:text-primary-600"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Ex: ${PLACEHOLDERS[placeholderIndex]}`}
              className="h-14 w-full rounded-2xl bg-muted/40 pl-14 pr-4 text-base text-foreground placeholder:text-muted-foreground/80 transition-colors focus:bg-surface focus:outline-none sm:h-16 sm:text-lg"
              aria-label="Buscar matéria ou assunto"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-8 text-base font-semibold text-white shadow-soft transition-all duration-200 hover:scale-[1.02] hover:bg-primary-700 hover:shadow-soft-lg active:scale-[0.98] sm:h-16"
          >
            Buscar
          </button>
        </div>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {modality === "online"
          ? "Encontre professores para aprender do seu jeito"
          : "Encontre tutores perto de você para aulas presenciais"}
      </p>
    </div>
  );
}
