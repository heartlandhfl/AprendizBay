import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CatalogLoadState from "@/components/catalog/CatalogLoadState";

describe("CatalogLoadState", () => {
  it("explains Firebase unavailability in Brazilian Portuguese", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(<CatalogLoadState kind="unavailable" onRetry={onRetry} />);

    expect(
      screen.getByRole("heading", { name: "Serviço temporariamente indisponível" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mariana Silva")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows a distinct data-error message", () => {
    render(<CatalogLoadState kind="error" />);

    expect(
      screen.getByRole("heading", { name: "Erro ao carregar os professores" }),
    ).toBeInTheDocument();
  });
});
