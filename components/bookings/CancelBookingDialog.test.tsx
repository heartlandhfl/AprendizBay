import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CancelBookingDialog from "@/components/bookings/CancelBookingDialog";
import type { Booking } from "@/lib/bookings/types";

vi.mock("@/lib/bookings/service", () => ({
  formatBookingPrice: () => "R$ 80",
}));

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-123",
    studentId: "student-1",
    tutorId: "tutor-1",
    type: "individual",
    status: "confirmed",
    price: 80,
    paymentStatus: "paid",
    scheduledAt: { toDate: () => new Date("2099-09-02T12:00:00.000Z") } as Booking["scheduledAt"],
    createdAt: { toDate: () => new Date("2026-08-20T12:00:00.000Z") } as Booking["createdAt"],
    ...overrides,
  };
}

describe("CancelBookingDialog", () => {
  it("shows the centralized Portuguese copy for a free-window student refund", () => {
    render(
      <CancelBookingDialog
        booking={booking()}
        actor="student"
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Cancelar e reembolsar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar e reembolsar" })).toBeInTheDocument();
    expect(screen.getByText(/estornado integralmente pelo Asaas/)).toBeInTheDocument();
  });
});
