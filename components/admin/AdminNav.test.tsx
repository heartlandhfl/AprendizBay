import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminNav from "@/components/admin/AdminNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

describe("AdminNav", () => {
  it("keeps the admin area links in Portuguese", () => {
    render(<AdminNav />);

    expect(screen.getByRole("navigation", { name: "Área administrativa" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visão geral" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Verificação" })).toHaveAttribute(
      "href",
      "/admin/tutors",
    );
    expect(screen.getByRole("link", { name: "Professores" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reservas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pagamentos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Avaliações" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Usuários" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Caixa de Entrada" })).toHaveAttribute(
      "href",
      "/admin/contact-inbox",
    );
  });
});
