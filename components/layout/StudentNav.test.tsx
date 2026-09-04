import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudentNav from "@/components/layout/StudentNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/lib/auth/AuthContext";

describe("StudentNav", () => {
  it("renders student navigation links", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "student-1" } as never,
      userDoc: { role: "student" } as never,
      loading: false,
    });

    render(<StudentNav />);

    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Encontrar Professor" })).toHaveAttribute(
      "href",
      "/search",
    );
    expect(screen.getByRole("link", { name: "Minhas Aulas" })).toHaveAttribute(
      "href",
      "/bookings",
    );
    expect(screen.getByRole("link", { name: "Mensagens" })).toHaveAttribute(
      "href",
      "/mensagens",
    );
    expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute(
      "href",
      "/configuracoes",
    );
  });

  it("does not render for tutors", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "tutor-1" } as never,
      userDoc: { role: "tutor" } as never,
      loading: false,
    });

    const { container } = render(<StudentNav />);
    expect(container).toBeEmptyDOMElement();
  });
});
