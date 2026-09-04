import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Navbar from "@/components/layout/Navbar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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

import { useAuth } from "@/lib/auth/AuthContext";

describe("Navbar", () => {
  it("shows Seja um Professor only for guests", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      userDoc: null,
      loading: false,
    });

    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Seja um Professor" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Minhas aulas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Meu painel" })).not.toBeInTheDocument();
  });

  it("shows student dashboard link for logged-in students", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "student-1", displayName: "Ana" } as never,
      userDoc: { role: "student", displayName: "Ana" } as never,
      loading: false,
    });

    render(<Navbar />);

    expect(screen.queryByRole("link", { name: "Seja um Professor" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Minhas aulas" }).length).toBeGreaterThan(0);
  });

  it("shows tutor dashboard link for logged-in professors", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "tutor-1", displayName: "Sam Barreto" } as never,
      userDoc: { role: "tutor", displayName: "Sam Barreto" } as never,
      loading: false,
    });

    render(<Navbar />);

    expect(screen.queryByRole("link", { name: "Seja um Professor" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Meu painel" }).length).toBeGreaterThan(0);
  });
});
