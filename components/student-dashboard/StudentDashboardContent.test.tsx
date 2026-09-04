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
    onChange({
      preferredSubject: "Matemática",
      preferredModality: "online",
      learningObjective: "Reforço escolar",
    });
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
    vi.mocked(subscribeToStudentBookings).mockImplementation((_uid, onChange) => {
      onChange([]);
      return vi.fn();
    });
    vi.mocked(subscribeToUserConversations).mockImplementation((_uid, onChange) => {
      onChange([]);
      return vi.fn();
    });
    vi.mocked(fetchOpenCollectiveHubs).mockResolvedValue({ state: "ok", items: [] } as never);
  });

  it("renders the production dashboard header and primary CTA", async () => {
    render(<StudentDashboardContent />);

    expect(await screen.findByRole("heading", { name: /Olá, Maria!/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Encontrar um professor" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Minhas aulas" })).toHaveAttribute("href", "/bookings");
    expect(screen.getByRole("link", { name: "Mensagens" })).toHaveAttribute("href", "/mensagens");
  });

  it("prefills search links from the learning profile", async () => {
    render(<StudentDashboardContent />);

    expect(await screen.findByRole("heading", { name: /Olá, Maria!/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Encontrar um professor" })[0]).toHaveAttribute(
      "href",
      "/search?subject=Matem%C3%A1tica&modality=online",
    );
  });

  it("shows confirmed paid upcoming lesson details", async () => {
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

  it("shows the next-lesson empty state when there is no confirmed paid lesson", async () => {
    render(<StudentDashboardContent />);

    expect(await screen.findByText("Você ainda não tem uma próxima aula.")).toBeInTheDocument();
  });

  it("shows active booking activity for pending payment", async () => {
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

    expect(await screen.findByText("Atividade nas reservas")).toBeInTheDocument();
    expect(screen.getByText("Aguardando pagamento")).toBeInTheDocument();
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

    expect(await screen.findByRole("heading", { name: "Mensagens" })).toBeInTheDocument();
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
      "/turmas/hub-1",
    );
  });

  it("shows profile summary and edit link", async () => {
    render(<StudentDashboardContent />);

    expect(await screen.findByText("Meu perfil de aprendizagem")).toBeInTheDocument();
    expect(screen.getByText("Matéria de interesse")).toBeInTheDocument();
    expect(screen.getByText("Reforço escolar")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Editar meu perfil" })[0]).toHaveAttribute(
      "href",
      "/account/setup",
    );
  });
});
