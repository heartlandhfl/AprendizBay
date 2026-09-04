import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookingsPageContent from "@/components/bookings/BookingsPageContent";

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/components/bookings/StudentBookingsList", () => ({
  default: () => <div>Student bookings</div>,
}));

vi.mock("@/components/bookings/TutorDashboardBookings", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Tutor pending bookings {embedded ? "embedded" : "standalone"}</div>
  ),
}));

vi.mock("@/components/bookings/TutorConfirmedBookings", () => ({
  default: ({ showEmptyState }: { showEmptyState?: boolean }) => (
    <div>Tutor confirmed bookings {showEmptyState ? "with-empty" : "default"}</div>
  ),
}));

import { useAuth } from "@/lib/auth/AuthContext";

describe("BookingsPageContent", () => {
  it("shows student bookings for students", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "student-1" } as never,
      userDoc: { role: "student" } as never,
      loading: false,
    });

    render(<BookingsPageContent />);

    expect(screen.getByText("Student bookings")).toBeInTheDocument();
  });

  it("shows tutor booking workspace for tutors", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "tutor-1" } as never,
      userDoc: { role: "tutor" } as never,
      loading: false,
    });

    render(<BookingsPageContent />);

    expect(screen.getByRole("heading", { name: "Minhas reservas" })).toBeInTheDocument();
    expect(screen.getByText("Tutor pending bookings embedded")).toBeInTheDocument();
    expect(screen.getByText("Tutor confirmed bookings with-empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o painel completo" })).toHaveAttribute(
      "href",
      "/tutor/dashboard",
    );
  });

  it("shows tutor booking workspace for lecturer profiles", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "lecturer-1" } as never,
      userDoc: { role: "lecturer" } as never,
      loading: false,
    });

    render(<BookingsPageContent />);

    expect(screen.getByText("Tutor pending bookings embedded")).toBeInTheDocument();
  });
});
