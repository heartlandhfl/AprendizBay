import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth/AuthContext";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/bookings/usePendingBookingCount", () => ({
  usePendingBookingCount: () => 0,
}));

vi.mock("@/lib/auth/service", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/components/brand/BrandLogo", () => ({
  BrandLogoLink: () => <a href="/">Aprendiz Bay</a>,
}));

function mockAuth(role?: string | null) {
  vi.mocked(useAuth).mockReturnValue({
    user: role ? ({ uid: "user-1", displayName: "Ana Silva" } as never) : null,
    userDoc: role
      ? ({ role, displayName: "Ana Silva", email: "ana@test.com" } as never)
      : null,
    loading: false,
  });
}

describe("Navbar", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset();
  });

  it("keeps guest actions for unauthenticated visitors", () => {
    mockAuth(null);
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Cadastrar" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Seja um Professor" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Minhas Aulas" })).not.toBeInTheDocument();
  });

  it("shows student destinations including search", async () => {
    mockAuth("student");
    const user = userEvent.setup();
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Encontrar Professor" })).toHaveAttribute(
      "href",
      "/search",
    );
    expect(screen.getByRole("link", { name: "Minhas Aulas" })).toHaveAttribute(
      "href",
      "/bookings",
    );
    expect(screen.getAllByRole("link", { name: "Mensagens" }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Ana Silva/ }));
    expect(screen.getByRole("menuitem", { name: "Meu painel" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByText("tutor")).not.toBeInTheDocument();
  });

  it("labels lecturers as Professor and links to the tutor dashboard", async () => {
    mockAuth("lecturer");
    const user = userEvent.setup();
    render(<Navbar />);

    expect(screen.getByText("Professor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Meu painel" })).toHaveAttribute(
      "href",
      "/tutor/dashboard",
    );

    await user.click(screen.getByRole("button", { name: /Ana Silva/ }));
    expect(screen.getByRole("menuitem", { name: "Perfil de professor" })).toHaveAttribute(
      "href",
      "/tutor/settings",
    );
    expect(screen.queryByText("tutor")).not.toBeInTheDocument();
  });

  it("treats legacy tutor profiles as professors", async () => {
    mockAuth("tutor");
    render(<Navbar />);

    expect(screen.getByText("Professor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Meu painel" })).toHaveAttribute(
      "href",
      "/tutor/dashboard",
    );
  });

  it("shows facilitator navigation without bookings", () => {
    mockAuth("facilitator");
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Painel do Facilitador" })).toHaveAttribute(
      "href",
      "/facilitador",
    );
    expect(screen.queryByRole("link", { name: "Minhas Aulas" })).not.toBeInTheDocument();
  });

  it("preserves the admin panel destination", () => {
    mockAuth("admin");
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Painel admin" })).toHaveAttribute("href", "/admin");
  });
});
