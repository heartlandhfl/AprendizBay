import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SearchFilters, {
  DEFAULT_FILTERS,
  type SearchFilterState,
} from "@/components/search/SearchFilters";

function renderFilters(
  overrides: Partial<SearchFilterState> = {},
  resultCount = 3,
) {
  const onChange = vi.fn();
  const filters: SearchFilterState = { ...DEFAULT_FILTERS, ...overrides };

  render(
    <SearchFilters
      filters={filters}
      onChange={onChange}
      resultCount={resultCount}
    />,
  );

  return { onChange };
}

describe("SearchFilters", () => {
  it("shows the filter headings and a pluralized result count", () => {
    renderFilters({}, 3);

    expect(screen.getAllByText("Filtros").length).toBeGreaterThan(0);
    expect(screen.getByText("3 resultados")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Matéria")[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText("Faixa de Preço")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Modalidade")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Tipo de Aula")[0]).toBeInTheDocument();
  });

  it("uses the singular label when there is one result", () => {
    renderFilters({}, 1);

    expect(screen.getByText("1 resultado")).toBeInTheDocument();
  });

  it("notifies the parent when the subject changes", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters();

    await user.selectOptions(screen.getAllByLabelText("Matéria")[0], "Inglês");

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      subject: "Inglês",
    });
  });

  it("notifies the parent when the price range changes", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters();

    await user.selectOptions(screen.getAllByLabelText("Faixa de Preço")[0], "2");

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      priceRangeIndex: 2,
    });
  });

  it("toggles modality and lesson type filters", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters();

    await user.click(screen.getAllByRole("button", { name: "Online" })[0]);
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      modality: "online",
    });

    await user.click(screen.getAllByRole("button", { name: "Coletivo" })[0]);
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      lessonType: "coletivo",
    });
  });

  it("resets every filter to the defaults", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters({
      subject: "Python",
      priceRangeIndex: 3,
      modality: "presencial",
      lessonType: "individual",
    });

    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(onChange).toHaveBeenCalledWith(DEFAULT_FILTERS);
  });
});
