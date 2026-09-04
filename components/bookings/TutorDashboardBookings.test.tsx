import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TutorDashboardBookings from "@/components/bookings/TutorDashboardBookings";

const { mockUseAuth, mockSubscribe, mockSubscribeConversations } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockSubscribe: vi.fn(),
  mockSubscribeConversations: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/bookings/service", () => ({
  subscribeToTutorPendingBookings: (...args: unknown[]) => mockSubscribe(...args),
  fetchUserDisplayName: vi.fn().mockResolvedValue("Ana Souza"),
  confirmBookingAsTutor: vi.fn(),
  cancelBookingAsTutor: vi.fn(),
  formatBookingDate: () => "10 de set. de 2026, 14:00",
  formatBookingPrice: (price: number) => `R$ ${price}`,
}));

vi.mock("@/lib/payments/status", () => ({
  getPaymentLifecycle: () => "unpaid",
  getTutorPaymentCopy: () => null,
  hasTutorRequestedPayment: () => false,
}));

vi.mock("@/lib/conversations/service", () => ({
  subscribeToUserConversations: (...args: unknown[]) => mockSubscribeConversations(...args),
}));

describe("TutorDashboardBookings", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { uid: "tutor-1" },
      userDoc: { role: "lecturer" },
      loading: false,
    });
    mockSubscribeConversations.mockImplementation((_id, onChange) => {
      onChange([]);
      return () => {};
    });
  });

  it("shows the Portuguese empty state for pending requests", async () => {
    mockSubscribe.mockImplementation((_id, onChange) => {
      onChange([]);
      return () => {};
    });

    render(<TutorDashboardBookings embedded />);

    expect(await screen.findByRole("heading", { name: "Novas solicitações" })).toBeInTheDocument();
    expect(
      screen.getByText("Você ainda não recebeu solicitações de aula."),
    ).toBeInTheDocument();
  });

  it("offers accept, decline and details actions for pending requests", async () => {
    mockSubscribe.mockImplementation((_id, onChange) => {
      void onChange([
        {
          id: "book-1",
          studentId: "student-1",
          tutorId: "tutor-1",
          type: "individual",
          status: "pending",
          price: 70,
          scheduledAt: { toDate: () => new Date(), toMillis: () => Date.now() },
        },
      ]);
      return () => {};
    });

    render(<TutorDashboardBookings embedded />);

    expect(await screen.findByRole("button", { name: "Aceitar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recusar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver detalhes" })).toHaveAttribute(
      "href",
      "/aulas/book-1",
    );
    expect(screen.queryByRole("link", { name: "Ver conversa" })).not.toBeInTheDocument();
  });

  it("shows a conversation link only when the student already started a thread", async () => {
    mockSubscribe.mockImplementation((_id, onChange) => {
      void onChange([
        {
          id: "book-1",
          studentId: "student-1",
          tutorId: "tutor-1",
          type: "individual",
          status: "pending",
          price: 70,
          scheduledAt: { toDate: () => new Date(), toMillis: () => Date.now() },
        },
      ]);
      return () => {};
    });
    mockSubscribeConversations.mockImplementation((_id, onChange) => {
      onChange([
        {
          id: "student-1_tutor-1",
          studentId: "student-1",
          tutorId: "tutor-1",
          participantIds: ["student-1", "tutor-1"],
        },
      ]);
      return () => {};
    });

    render(<TutorDashboardBookings embedded />);

    expect(await screen.findByRole("link", { name: "Ver conversa" })).toHaveAttribute(
      "href",
      "/mensagens/student-1_tutor-1",
    );
  });
});
