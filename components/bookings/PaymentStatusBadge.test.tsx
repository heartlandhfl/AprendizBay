import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PaymentStatusBadge from "@/components/bookings/PaymentStatusBadge";

describe("PaymentStatusBadge", () => {
  it("shows Portuguese labels for failed and expired payments", () => {
    const { rerender } = render(<PaymentStatusBadge status="failed" />);
    expect(screen.getByText("Pagamento falhou")).toBeInTheDocument();

    rerender(<PaymentStatusBadge status="expired" />);
    expect(screen.getByText("Checkout expirado")).toBeInTheDocument();

    rerender(<PaymentStatusBadge status="paid" />);
    expect(screen.getByText("Pago")).toBeInTheDocument();
  });
});
