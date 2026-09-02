import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PayBookingForm from "@/components/bookings/PayBookingForm";

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { getIdToken: async () => "token", email: "ana@test.com" },
    userDoc: { email: "ana@test.com" },
  }),
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockMercadoPagoPaymentBrick() {
      return <div data-testid="mp-brick">Mercado Pago Brick</div>;
    },
}));

describe("PayBookingForm", () => {
  it("shows the payment headline and Mercado Pago brick container", () => {
    render(
      <PayBookingForm
        bookingId="booking-123"
        price={80}
        headline="R$ 80 ainda não foi pago."
      />,
    );

    expect(screen.getByText("R$ 80 ainda não foi pago.")).toBeInTheDocument();
    expect(screen.getByTestId("mp-brick")).toBeInTheDocument();
  });
});
