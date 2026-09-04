import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import StudentDashboardContent from "@/components/student-dashboard/StudentDashboardContent";

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/bookings/service", () => ({
  subscribeToStudentBookings: vi.fn((_uid, onChange) => {
    onChange([]);
    return vi.fn();
  }),
  fetchTutorLessonDetails: vi.fn(),
  formatBookingDate: vi.fn(() => "10 set. 2026, 14:00"),
}));

vi.mock("@/lib/conversations/service", () => ({
  subscribeToUserConversations: vi.fn((_uid, onChange) => {
    onChange([]);
    return vi.fn();
  }),
}));

vi.mock("@/lib/reviews/client", () => ({
  subscribeToStudentReviewBookingIds: vi.fn((_uid, onChange) => {
    onChange(new Set());
    return vi.fn();
  }),
}));

vi.mock("@/lib/student-dashboard/preferences", () => ({
  subscribeToStudentLearningProfile: vi.fn((_uid, onChange) => {
    onChange({});
    return vi.fn();
  }),
}));

vi.mock("@/lib/hubs/service", () => ({
  fetchOpenCollectiveHubs: vi.fn(async () => ({ state: "ok", items: [] })),
  formatHubPrice: vi.fn((price: number) => `R$ ${price}`),
}));

vi.mock("@/lib/tutors/client", () => ({
  fetchVerifiedTutors: vi.fn(async () => ({ state: "ok", items: [] })),
}));

vi.mock("@/components/search/TutorCard", () => ({
  default: ({ tutor }: { tutor: { name: string } }) => <div>Professor {tutor.name}</div>,
}));

import { useAuth } from "@/lib/auth/AuthContext";
import { subscribeToStudentBookings } from "@/lib/bookings/service";
import { subscribeToUserConversations } from "@/lib/conversations/service";
import { fetchOpenCollectiveHubs } from "@/lib/hubs/service";

describe("StudentDashboardContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "student-1", displayName: "Maria Silva" } as never,
      userDoc: { role: "student", displayName: "Maria Silva" } as never,
      loading: false,
    });
  });

  it("renders the dashboard header and search CTA", async () => {
    render(<StudentDashboardContent />);

    expect(await screen.findByRole("heading", { name: /Olá, Maria!/ })).toBeInTheDocument();
    expect(screen.getByText("Encontrar um professor")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar professores")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Encontrar aulas em grupo" })).toHaveAttribute(
      "href",
      "/search?lessonType=coletivo",
    );
  });

  it("shows upcoming individual lesson details", async () => {
    vi.mocked(subscribeToStudentBookings).mockImplementation((_uid, onChange) => {
      onChange([
        {
          id: "booking-1",
          studentId: "student-1",
          tutorId: "tutor-1",
          type: "individual",
          status: "confirmed",
          price: 80,
          scheduledAt: { toMillis: () => Date.parse("2026-09-10T14:00:00.000Z") } as never,
          createdAt: { toMillis: () => Date.now() } as never,
          paymentStatus: "paid",
        },
      ]);
      return vi.fn();
    });

    const { fetchTutorLessonDetails } = await import("@/lib/bookings/service");
    vi.mocked(fetchTutorLessonDetails).mockResolvedValue({
      name: "Prof. Ana",
      subject: "Matemática",
      modality: "online",
    });

    render(<StudentDashboardContent />);

    expect(await screen.findByText("Próxima aula")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Matemática" })).toBeInTheDocument();
    expect(screen.getByText("com Prof. Ana")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver aula" })).toHaveAttribute(
      "href",
      "/aulas/booking-1",
    );
  });

  it("shows pending payment action", async () => {
    vi.mocked(subscribeToStudentBookings).mockImplementation((_uid, onChange) => {
      onChange([
        {
          id: "booking-pay",
          studentId: "student-1",
          tutorId: "tutor-1",
          type: "individual",
          status: "pending",
          price: 80,
          scheduledAt: { toMillis: () => Date.parse("2026-09-10T14:00:00.000Z") } as never,
          createdAt: { toMillis: () => Date.now() } as never,
          paymentStatus: "awaiting_payment",
        },
      ]);
      return vi.fn();
    });

    const { fetchTutorLessonDetails } = await import("@/lib/bookings/service");
    vi.mocked(fetchTutorLessonDetails).mockResolvedValue({
      name: "Prof. Ana",
      subject: "Matemática",
      modality: "online",
    });

    render(<StudentDashboardContent />);

    expect(await screen.findByText("Pagamento pendente")).toBeInTheDocument();
  });

  it("shows messages preview", async () => {
    vi.mocked(subscribeToUserConversations).mockImplementation((_uid, onChange) => {
      onChange([
        {
          id: "student-1_tutor-1",
          studentId: "student-1",
          tutorId: "tutor-1",
          participantIds: ["student-1", "tutor-1"],
          tutorName: "Prof. Ana",
          lastMessage: "Mensagem de teste",
        },
      ]);
      return vi.fn();
    });

    render(<StudentDashboardContent />);

    expect(await screen.findByText("Mensagens")).toBeInTheDocument();
    expect(screen.getByText("Prof. Ana")).toBeInTheDocument();
    expect(screen.getByText("Mensagem de teste")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver mensagens" })).toHaveAttribute(
      "href",
      "/mensagens",
    );
  });

  it("shows group learning section", async () => {
    vi.mocked(fetchOpenCollectiveHubs).mockResolvedValue({
      state: "ok",
      items: [
        {
          id: "hub-1",
          title: "Inglês em grupo",
          description: "Turma aberta",
          confirmedStudents: 2,
          maxStudents: 6,
          currentPrice: 30,
          fullPrice: 40,
          schedule: "10 set · 19:00",
          modality: "online",
          subject: "Inglês",
          tutorName: "Prof. Ana",
          tutorId: "tutor-1",
          status: "open",
          isJoined: false,
        },
      ],
    } as never);

    render(<StudentDashboardContent />);

    expect(await screen.findByText("Aprenda em grupo")).toBeInTheDocument();
    expect(screen.getByText("Inglês em grupo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver turma" })).toHaveAttribute(
      "href",
      "/turmas?id=hub-1",
    );
  });
});
