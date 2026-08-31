import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OperationsDashboard from "@/components/admin/OperationsDashboard";
import type { AdminOperationsDashboard } from "@/lib/admin/dashboard";

const { mockFetchDashboard } = vi.hoisted(() => ({
  mockFetchDashboard: vi.fn(),
}));

vi.mock("@/lib/admin/client", () => ({
  fetchAdminOperationsDashboard: () => mockFetchDashboard(),
}));

const dashboard: AdminOperationsDashboard = {
  generatedAt: "2026-08-31T12:00:00.000Z",
  overview: {
    students: { available: true, value: 12 },
    tutors: { available: true, value: 4 },
    pendingTutors: { available: true, value: 1 },
    pendingBookings: { available: true, value: 2 },
    confirmedBookings: { available: true, value: 3 },
    completedBookings: { available: true, value: 5 },
    awaitingPayments: { available: true, value: 1 },
    completedPayments: { available: true, value: 6 },
    cancellations: { available: true, value: 1 },
    refunds: { available: true, value: 1 },
  },
  tutors: {
    pending: { available: true, value: 1 },
    approved: { available: true, value: 2 },
    changesRequested: { available: true, value: 0 },
    rejected: { available: true, value: 0 },
    suspended: { available: true, value: 1 },
  },
  bookings: {
    pending: { available: true, value: 2 },
    awaitingPayment: { available: true, value: 1 },
    confirmed: { available: true, value: 3 },
    completed: { available: true, value: 5 },
    cancelled: { available: true, value: 1 },
  },
  payments: {
    gross: { available: true, value: 150 },
    platformFees: { available: false },
    tutorAmount: { available: false },
    refunds: { available: true, value: 50 },
  },
  reviews: {
    recent: [
      {
        id: "booking-1",
        tutorId: "tutor-1",
        studentId: "student-1",
        bookingId: "booking-1",
        rating: 5,
        comment: "Aula clara e objetiva.",
        createdAt: "2026-08-20T12:00:00.000Z",
      },
    ],
    recentAvailable: true,
    reported: { available: false },
  },
  users: {
    students: { available: true, value: 12 },
    tutors: { available: true, value: 4 },
    suspendedAccounts: { available: true, value: 1 },
  },
};

describe("OperationsDashboard", () => {
  beforeEach(() => {
    mockFetchDashboard.mockReset();
    mockFetchDashboard.mockResolvedValue(dashboard);
  });

  it("renders operational sections from server data and does not invent missing metrics", async () => {
    render(<OperationsDashboard />);

    expect(await screen.findByRole("heading", { name: "Painel operacional" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Visão geral" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Professores" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Reservas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Pagamentos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Avaliações" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Usuários" })).toBeInTheDocument();
    expect(screen.getByText("Total de alunos")).toBeInTheDocument();
    expect(screen.getByText("Aula clara e objetiva.")).toBeInTheDocument();
    expect(screen.getAllByText("Indisponível").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Ainda não há fluxo de denúncia de avaliações.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "verificação de professores" })).toHaveAttribute(
      "href",
      "/admin/tutors",
    );
  });

  it("shows the API error instead of placeholder statistics", async () => {
    mockFetchDashboard.mockRejectedValue(new Error("Acesso restrito a administradores."));

    render(<OperationsDashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Acesso restrito a administradores.",
    );
    expect(screen.queryByText("Total de alunos")).not.toBeInTheDocument();
  });
});
