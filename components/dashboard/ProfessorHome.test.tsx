import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfessorHome from "@/components/dashboard/ProfessorHome";

const {
  mockUseAuth,
  mockUseTutorProfile,
  mockSubscribeBookings,
  mockSubscribeHubs,
  mockSubscribeConversations,
  mockFetchEarnings,
  mockFetchName,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseTutorProfile: vi.fn(),
  mockSubscribeBookings: vi.fn(),
  mockSubscribeHubs: vi.fn(),
  mockSubscribeConversations: vi.fn(),
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

vi.mock("@/lib/conversations/service", () => ({
  subscribeToUserConversations: (...args: unknown[]) => mockSubscribeConversations(...args),
}));

vi.mock("@/lib/tutors/earnings-client", () => ({
  fetchOwnTutorEarnings: () => mockFetchEarnings(),
}));

vi.mock("@/components/availability/TutorAvailabilityEditor", () => ({
  default: () => <section>Editor de disponibilidade</section>,
}));

vi.mock("@/components/bookings/TutorDashboardBookings", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Novas solicitações {embedded ? "embedded" : "standalone"}</div>
  ),
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
      tutorDoc: { name: "Mariana Silva", subject: "Inglês", modality: "online" },
      loading: false,
      isProfileComplete: false,
      completion: {
        percentage: 86,
        hasProfile: true,
        missing: ["credential"],
        filled: 6,
        total: 7,
      },
    });
    mockSubscribeBookings.mockImplementation((_id, onChange) => {
      onChange([]);
      return () => {};
    });
    mockSubscribeHubs.mockImplementation((_id, onChange) => {
      onChange([]);
      return () => {};
    });
    mockSubscribeConversations.mockImplementation((_id, onChange) => {
      onChange([]);
      return () => {};
    });
    mockFetchEarnings.mockResolvedValue({
      paidTotal: 80,
      pendingTotal: 20,
      processingTotal: 0,
      paidCount: 1,
      pendingCount: 1,
      processingCount: 0,
    });
    mockFetchName.mockResolvedValue("Ana Souza");
  });

  it("renders the production professor header and primary actions", async () => {
    render(<ProfessorHome />);

    expect(
      screen.getByRole("heading", { name: "Olá, Professor(a) Mariana! 👋" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Perfil 86% completo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Completar cadastro" })).toHaveAttribute(
      "href",
      "/tutor/onboarding",
    );
    expect(screen.getAllByRole("link", { name: "Ver meu perfil" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Gerenciar disponibilidade" })[0]).toHaveAttribute(
      "href",
      "#disponibilidade",
    );
    expect(screen.getByRole("link", { name: "Ver minhas aulas" })).toHaveAttribute(
      "href",
      "/bookings",
    );
    expect(screen.getByText("Encontrar oportunidades (em breve)")).toBeInTheDocument();
    expect(screen.getByText("Novas solicitações embedded")).toBeInTheDocument();
    expect(await screen.findByText(/R\$\s*80/)).toBeInTheDocument();
  });

  it("shows empty states for upcoming classes, hubs and students", () => {
    render(<ProfessorHome />);

    expect(screen.getByText("Você não tem aulas próximas.")).toBeInTheDocument();
    expect(
      screen.getByText("Crie sua primeira turma e comece a ensinar em grupo."),
    ).toBeInTheDocument();
    expect(screen.getByText("Você ainda não tem alunos.")).toBeInTheDocument();
  });

  it("shows upcoming confirmed paid lessons from existing booking data", async () => {
    mockSubscribeBookings.mockImplementation((_id, onChange) => {
      onChange([
        {
          id: "ind-1",
          studentId: "student-1",
          tutorId: "tutor-1",
          type: "individual",
          status: "confirmed",
          paymentStatus: "paid",
          scheduledAt: timestamp("2099-09-10T14:00:00"),
        },
      ]);
      return () => {};
    });

    render(<ProfessorHome />);

    expect((await screen.findAllByText("Ana Souza")).length).toBeGreaterThan(0);
    expect(screen.getByText("Individual")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver aula" })).toHaveAttribute(
      "href",
      "/aulas/ind-1",
    );
  });

  it("shows message preview from existing conversations", async () => {
    mockSubscribeConversations.mockImplementation((_id, onChange) => {
      onChange([
        {
          id: "student-1_tutor-1",
          studentId: "student-1",
          tutorId: "tutor-1",
          participantIds: ["student-1", "tutor-1"],
          studentName: "Ana Souza",
          lastMessage: "Olá, professor!",
        },
      ]);
      return () => {};
    });

    render(<ProfessorHome />);

    expect(await screen.findByText("Olá, professor!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver mensagens" })).toHaveAttribute(
      "href",
      "/mensagens",
    );
  });
});
