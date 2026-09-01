"use client";

import { SlidersHorizontal } from "lucide-react";
import { PRICE_RANGES, SUBJECTS } from "@/lib/tutors/catalog-options";
import { SEARCH_CITIES } from "@/lib/tutors/constants";
import {
  ALL_CITIES_LABEL,
  ALL_EDUCATION_LEVELS_LABEL,
  DEFAULT_FILTERS,
  EDUCATION_LEVELS,
  EXPERIENCE_OPTIONS,
  MIN_RATING_OPTIONS,
  countActiveSearchFilters,
  type SearchFilterState,
} from "@/lib/tutors/search";

export type { SearchFilterState };
export { DEFAULT_FILTERS };

interface SearchFiltersProps {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
  resultCount: number;
}

const SELECT_CLASS =
  "w-full rounded-2xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground transition-colors focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-200";

function FilterFields({
  filters,
  onChange,
  idPrefix,
}: {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor={`${idPrefix}-subject`}
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Disciplina
        </label>
        <select
          id={`${idPrefix}-subject`}
          value={filters.subject}
          onChange={(e) => onChange({ ...filters, subject: e.target.value })}
          className={SELECT_CLASS}
        >
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-city`}
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Cidade
        </label>
        <select
          id={`${idPrefix}-city`}
          value={filters.city}
          onChange={(e) => onChange({ ...filters, city: e.target.value })}
          className={SELECT_CLASS}
        >
          <option value={ALL_CITIES_LABEL}>{ALL_CITIES_LABEL}</option>
          {filters.city !== ALL_CITIES_LABEL &&
          !(SEARCH_CITIES as readonly string[]).includes(filters.city) ? (
            <option value={filters.city}>{filters.city}</option>
          ) : null}
          {SEARCH_CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-price`}
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Faixa de preço
        </label>
        <select
          id={`${idPrefix}-price`}
          value={filters.priceRangeIndex}
          onChange={(e) =>
            onChange({ ...filters, priceRangeIndex: Number(e.target.value) })
          }
          className={SELECT_CLASS}
        >
          {PRICE_RANGES.map((range, index) => (
            <option key={range.label} value={index}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-rating`}
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Avaliação mínima
        </label>
        <select
          id={`${idPrefix}-rating`}
          value={filters.minRating}
          onChange={(e) =>
            onChange({ ...filters, minRating: Number(e.target.value) })
          }
          className={SELECT_CLASS}
        >
          {MIN_RATING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="mb-2 block text-sm font-semibold text-foreground">
          Modalidade
        </span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "todos", label: "Todas" },
              { value: "online", label: "Online" },
              { value: "presencial", label: "Presencial" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...filters, modality: option.value })}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                filters.modality === option.value
                  ? "bg-primary-600 text-white shadow-soft"
                  : "bg-muted text-muted-foreground hover:bg-primary-50 hover:text-primary-700"
              }`}
              aria-pressed={filters.modality === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-semibold text-foreground">
          Tipo de aula
        </span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "todos", label: "Todas" },
              { value: "individual", label: "Aula individual" },
              { value: "coletivo", label: "Aula coletiva" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...filters, lessonType: option.value })}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                filters.lessonType === option.value
                  ? "bg-secondary-500 text-white shadow-soft"
                  : "bg-muted text-muted-foreground hover:bg-secondary-50 hover:text-secondary-700"
              }`}
              aria-pressed={filters.lessonType === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-education`}
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Nível de ensino
        </label>
        <select
          id={`${idPrefix}-education`}
          value={filters.educationLevel}
          onChange={(e) => onChange({ ...filters, educationLevel: e.target.value })}
          className={SELECT_CLASS}
        >
          <option value={ALL_EDUCATION_LEVELS_LABEL}>{ALL_EDUCATION_LEVELS_LABEL}</option>
          {EDUCATION_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-experience`}
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Experiência
        </label>
        <select
          id={`${idPrefix}-experience`}
          value={filters.minYearsOfExperience}
          onChange={(e) =>
            onChange({ ...filters, minYearsOfExperience: Number(e.target.value) })
          }
          className={SELECT_CLASS}
        >
          {EXPERIENCE_OPTIONS.map((option) => (
            <option key={option.minYears} value={option.minYears}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          id={`${idPrefix}-verified`}
          type="checkbox"
          checked={filters.verifiedOnly}
          onChange={(e) => onChange({ ...filters, verifiedOnly: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-200"
          aria-label="Professor verificado"
        />
        <span>
          <span className="block text-sm font-semibold text-foreground">
            Professor verificado
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Somente perfis aprovados pela Aprendiz Bay
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          id={`${idPrefix}-available`}
          type="checkbox"
          checked={filters.availableOnly}
          onChange={(e) => onChange({ ...filters, availableOnly: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-200"
          aria-label="Com horários disponíveis"
        />
        <span>
          <span className="block text-sm font-semibold text-foreground">
            Com horários disponíveis
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Professores que já cadastraram agenda
          </span>
        </span>
      </label>
    </div>
  );
}

export default function SearchFilters({
  filters,
  onChange,
  resultCount,
}: SearchFiltersProps) {
  const activeCount = countActiveSearchFilters(filters);

  return (
    <>
      <details className="mb-6 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border/50 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary-600" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Filtros</h2>
            {activeCount > 0 ? (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                {activeCount}
              </span>
            ) : null}
          </div>
          <span className="text-xs text-muted-foreground">
            {resultCount} resultado{resultCount !== 1 ? "s" : ""}
          </span>
        </summary>
        <div className="mt-4 border-t border-border/60 pt-4">
          <FilterFields filters={filters} onChange={onChange} idPrefix="mobile-filter" />
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="mt-6 w-full rounded-2xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Limpar filtros
          </button>
        </div>
      </details>

      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl bg-surface p-6 shadow-card ring-1 ring-border/50">
          <div className="mb-6 flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">Filtros</h2>
          </div>
          <FilterFields filters={filters} onChange={onChange} idPrefix="filter" />
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="mt-6 w-full rounded-2xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Limpar filtros
          </button>
        </div>
      </aside>
    </>
  );
}
