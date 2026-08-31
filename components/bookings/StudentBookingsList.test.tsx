import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Booking } from "@/lib/bookings/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1" } }),
}));

vi.mock("@/lib/bookings/service", () => ({
  subscribeToStudentBookings: (
    _studentId: string,
    onChange: (bookings: Booking[]) => void,
  ) => {
    onChange([
      {
        id: "booking-open",
        studentId: "student-1",
        tutorId: "tutor-1",
        type: "individual",
        status: "completed",
        price: 70,
        paymentStatus: "paid",
        scheduledAt: { toDate: () => new Date("2026-09-01T19:00:00.000Z") } as Booking["scheduledAt"],
        createdAt: { toDate: () => new Date("2026-08-20T19:00:00.000Z") } as Booking["createdAt"],
      },
      {
        id: "booking-reviewed",
        studentId: "student-1",
        tutorId: "tutor-1",
        type: "individual",
        status: "completed",
        price: 70,
        paymentStatus: "paid",
        scheduledAt: { toDate: () => new Date("2026-09-02T19:00:00.000Z") } as Booking["scheduledAt"],
        createdAt: { toDate: () => new Date("2026-08-21T19:00:00.000Z") } as Booking["createdAt"],
      },
    ]);
    return () => undefined;
  },
  fetchTutorName: async () => "Mariana Silva",
  formatBookingDate: () => "01/09/2026",
  formatBookingPrice: () => "R$ 70",
  cancelBookingAsStudent: vi.fn(),
}));

vi.mock("@/lib/reviews/client", () => ({
  subscribeToStudentReviewBookingIds: (
    _studentId: string,
    onChange: (bookingIds: Set<string>) => void,
  ) => {
    onChange(new Set(["booking-reviewed"]));
    return () => undefined;
  },
}));

import StudentBookingsList from "@/components/bookings/StudentBookingsList";

describe("StudentBookingsList review actions", () => {
  it("shows Avaliar aula when eligible and Avaliação enviada when already reviewed", async () => {
    render(<StudentBookingsList />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Avaliar aula" })).toBeInTheDocument();
    });
    expect(screen.getByText("Avaliação enviada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deixar avaliação" })).not.toBeInTheDocument();
  });
});
