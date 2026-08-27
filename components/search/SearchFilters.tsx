"use client";

import { SlidersHorizontal } from "lucide-react";
import {
  PRICE_RANGES,
  SUBJECTS,
  type FilterLessonType,
  type FilterModality,
} from "@/lib/mock-tutors";

export interface SearchFilterState {
  subject: string;
  priceRangeIndex: number;
  modality: FilterModality;
  lessonType: FilterLessonType;
}

interface SearchFiltersProps {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
  resultCount: number;
}

export const DEFAULT_FILTERS: SearchFilterState = {
  subject: "Todas as matérias",
  priceRangeIndex: 0,
  modality: "todos",
  lessonType: "todos",
};

function FilterFields({
  filters,
  onChange,
}: {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="filter-subject"
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Matéria
        </label>
        <select
          id="filter-subject"
          value={filters.subject}
          onChange={(e) => onChange({ ...filters, subject: e.target.value })}
          className="w-full rounded-2xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground transition-colors focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-200"
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
          htmlFor="filter-price"
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Faixa de Preço
        </label>
        <select
          id="filter-price"
          value={filters.priceRangeIndex}
          onChange={(e) =>
            onChange({ ...filters, priceRangeIndex: Number(e.target.value) })
          }
          className="w-full rounded-2xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground transition-colors focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          {PRICE_RANGES.map((range, index) => (
            <option key={range.label} value={index}>
              {range.label}
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
              onClick={() =>
                onChange({ ...filters, modality: option.value })
              }
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
          Tipo de Aula
        </span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "todos", label: "Todas" },
              { value: "individual", label: "Individual" },
              { value: "coletivo", label: "Coletivo" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                onChange({ ...filters, lessonType: option.value })
              }
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
    </div>
  );
}

export default function SearchFilters({
  filters,
  onChange,
  resultCount,
}: SearchFiltersProps) {
  return (
    <>
      {/* Mobile: compact top filter bar */}
      <div className="mb-6 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border/50 lg:hidden">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-foreground">Filtros</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {resultCount} resultado{resultCount !== 1 ? "s" : ""}
          </span>
        </div>
        <FilterFields filters={filters} onChange={onChange} />
      </div>

      {/* Desktop: sticky sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl bg-surface p-6 shadow-card ring-1 ring-border/50">
          <div className="mb-6 flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-foreground">Filtros</h2>
          </div>
          <FilterFields filters={filters} onChange={onChange} />
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
