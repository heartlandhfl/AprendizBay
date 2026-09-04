import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudentHome from "@/components/dashboard/StudentHome";

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "student-1", displayName: "Ana Silva" },
    userDoc: { role: "student", displayName: "Ana Silva" },
    loading: false,
  }),
}));

describe("StudentHome", () => {
  it("links students to search, bookings and messages without listing bookings", () => {
    render(<StudentHome />);

    expect(screen.getByRole("heading", { name: "Início" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Encontrar Professor/ })).toHaveAttribute(
      "href",
      "/search",
    );
    expect(screen.getByRole("link", { name: /Minhas Aulas/ })).toHaveAttribute(
      "href",
      "/bookings",
    );
    expect(screen.getByRole("link", { name: /Mensagens/ })).toHaveAttribute(
      "href",
      "/mensagens",
    );
    expect(screen.queryByText("Student bookings")).not.toBeInTheDocument();
  });
});
