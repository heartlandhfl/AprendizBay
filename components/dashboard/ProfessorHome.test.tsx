import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfessorHome from "@/components/dashboard/ProfessorHome";

const {
  mockUseAuth,
  mockUseTutorProfile,
  mockSubscribeBookings,
  mockSubscribeHubs,
  mockFetchEarnings,
  mockFetchName,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseTutorProfile: vi.fn(),
  mockSubscribeBookings: vi.fn(),
  mockSubscribeHubs: vi.fn(),
  mockFetchEarnings: vi.fn(),
  mockFetchName: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/tutors/useTutorProfile", () => ({
  useTutorProfile: () => mockUseTutorProfile(),
}));

vi.mock("@/lib/bookings/service", () => ({
  subscribeToTutorOwnedBookings: (...args: unknown[]) => mockSubscribeBookings(...args),
  fetchUserDisplayName: (...args: unknown[]) => mockFetchName(...args),
}));

vi.mock("@/lib/hubs/service", () => ({
  subscribeToTutorCollectiveHubs: (...args: unknown[]) => mockSubscribeHubs(...args),
}));

vi.mock("@/lib/tutors/earnings-client", () => ({
  fetchOwnTutorEarnings: () => mockFetchEarnings(),
}));

vi.mock("@/components/availability/TutorAvailabilityEditor", () => ({
  default: () => <section>Quando você pode dar aulas?</section>,
}));

vi.mock("@/components/bookings/TutorDashboardBookings", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Novas solicitações {embedded ? "embedded" : "standalone"}</div>
  ),
}));

vi.mock("@/components/bookings/TutorConfirmedBookings", () => ({
  default: () => <div>Aulas confirmadas</div>,
}));

vi.mock("@/components/hubs/CreateHubForm", () => ({
  default: () => <form>Criar turma coletiva</form>,
}));

vi.mock("@/components/tutors/VerificationStatusBanner", () => ({
  default: () => null,
}));

function timestamp(iso: string) {
  const date = new Date(iso);
  return { toDate: () => date, toMillis: () => date.getTime() };
}

describe("ProfessorHome", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { uid: "tutor-1", displayName: "Mariana Silva" },
      userDoc: { role: "lecturer", displayName: "Mariana Silva" },
      loading: false,
    });
    mockUseTutorProfile.mockReturnValue({
      tutorDoc: { name: "Mariana Silva" },
      loading: false,
      isProfileComplete: true,
      completion: { percentage: 86, hasProfile: true, missing: ["credential"], filled: 6, total: 7 },
    });
    mockSubscribeBookings.mockImplementation((_id, onChange) => {
      onChange([]);
      return () => {};
    });
    mockSubscribeHubs.mockImplementation((_id, onChange) => {
      onChange([]);
      return () => {};
    });
    mockFetchEarnings.mockResolvedValue({
      paidTotal: 80,
      pendingTotal: 0,
      processingTotal: 0,
      paidCount: 1,
      pendingCount: 0,
      processingCount: 0,
    });
    mockFetchName.mockResolvedValue("Ana Souza");
  });

  it("renders the professor shell, navigation and profile completion", async () => {
    render(<ProfessorHome />);

    expect(screen.getByRole("heading", { name: "Olá, Mariana! 👋" })).toBeInTheDocument();
    expect(screen.getByText("Seu perfil está 86% completo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Completar perfil" })).toHaveAttribute(
      "href",
      "/tutor/settings",
    );
    expect(screen.getByRole("navigation", { name: "Navegação do professor" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "/tutor/dashboard");
    expect(screen.getByRole("link", { name: "Solicitações" })).toHaveAttribute(
      "href",
      "/tutor/dashboard#solicitacoes",
    );
    expect(screen.getByRole("link", { name: "Meus Alunos" })).toHaveAttribute(
      "href",
      "/tutor/dashboard#alunos",
    );
    expect(screen.getByText("Novas solicitações embedded")).toBeInTheDocument();
    expect(screen.getByText("Quando você pode dar aulas?")).toBeInTheDocument();
    expect((await screen.findAllByText(/R\$\s*80/)).length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Você ainda não recebeu solicitações de aula."),
    ).not.toBeInTheDocument();
  });

  it("shows empty states for upcoming classes, hubs and students", () => {
    render(<ProfessorHome />);

    expect(screen.getByText("Você não tem aulas próximas.")).toBeInTheDocument();
    expect(
      screen.getByText("Crie sua primeira turma e comece a ensinar em grupo."),
    ).toBeInTheDocument();
    expect(screen.getByText("Você ainda não tem alunos.")).toBeInTheDocument();
  });

  it("shows upcoming individual and group lessons from existing booking and hub data", async () => {
    mockSubscribeBookings.mockImplementation((_id, onChange) => {
      onChange([
        {
          id: "ind-1",
          studentId: "student-1",
          tutorId: "tutor-1",
          type: "individual",
          status: "confirmed",
          scheduledAt: timestamp("2099-09-10T14:00:00"),
        },
      ]);
      return () => {};
    });
    mockSubscribeHubs.mockImplementation((_id, onChange) => {
      onChange([
        {
          id: "hub-1",
          title: "Inglês para Viagem",
          subject: "Inglês",
          status: "open",
          modality: "online",
          confirmedStudents: 2,
          maxStudents: 6,
          scheduledDate: "2099-09-12",
          startTime: "19:00",
          schedule: "Sexta 19h",
        },
      ]);
      return () => {};
    });

    render(<ProfessorHome />);

    expect((await screen.findAllByText("Ana Souza")).length).toBeGreaterThan(0);
    expect(screen.getByText("Individual")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar na aula" })).toHaveAttribute(
      "href",
      "/aulas/ind-1",
    );
    expect(screen.getAllByText("Inglês para Viagem").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Coletiva").length).toBeGreaterThan(0);
  });
});
