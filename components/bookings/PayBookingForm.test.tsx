import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PayBookingForm from "@/components/bookings/PayBookingForm";

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { getIdToken: async () => "token" },
    userDoc: { email: "ana@test.com" },
  }),
}));

describe("PayBookingForm", () => {
  it("shows the retry action in Brazilian Portuguese", () => {
    render(
      <PayBookingForm
        bookingId="booking-123"
        price={80}
        actionLabel="Tentar pagamento novamente"
        headline="R$ 80 ainda não foi pago."
      />,
    );

    expect(
      screen.getByRole("button", { name: "Tentar pagamento novamente" }),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 80 ainda não foi pago.")).toBeInTheDocument();
  });
});
