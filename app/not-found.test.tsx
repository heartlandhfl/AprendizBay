import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";

describe("NotFound", () => {
  it("shows Portuguese copy instead of the default English 404", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.queryByText(/this page could not be found/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Buscar professores" })).toHaveAttribute(
      "href",
      "/professores",
    );
  });
});
