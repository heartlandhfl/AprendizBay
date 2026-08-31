import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TutorCatalogProblem from "@/components/catalog/TutorCatalogProblem";

describe("TutorCatalogProblem", () => {
  it("does not render a fictional tutor when the catalog is unavailable", () => {
    render(<TutorCatalogProblem kind="unavailable" scope="profile" />);

    expect(
      screen.getByRole("heading", { name: "Não foi possível carregar o perfil" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mariana Silva")).not.toBeInTheDocument();
    expect(screen.queryByText("Professor verificado")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar professores" })).toHaveAttribute(
      "href",
      "/search",
    );
  });
});
