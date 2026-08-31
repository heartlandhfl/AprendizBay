import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BookingWidget from "@/components/tutor/BookingWidget";
import type { CollectiveHubLive } from "@/lib/hubs/types";
import { getTutorProfile } from "@/lib/tutor-profiles";

const {
  mockUseAuth,
  mockCreateBooking,
  mockJoinCollectiveClassAndBook,
  mockPush,
  mockTrackEvent,
  mockHubs,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockCreateBooking: vi.fn(),
  mockJoinCollectiveClassAndBook: vi.fn(),
  mockPush: vi.fn(),
  mockTrackEvent: vi.fn(),
  mockHubs: [
    {
      id: "hub-1",
      title: "Inglês para Viagem",
      description: "Frases essenciais",
      confirmedStudents: 2,
      maxStudents: 6,
      currentPrice: 28,
      fullPrice: 22,
      schedule: "Terças, 19h · Online",
      modality: "online",
      status: "open",
      tutorId: "1",
      isJoined: false,
      subject: "Inglês",
      tutorName: "Mariana Silva",
      individualPrice: 70,
    },
  ] satisfies CollectiveHubLive[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/tutor/1",
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

vi.mock("@/lib/hubs/service", () => ({
  joinCollectiveClassAndBook: mockJoinCollectiveClassAndBook,
}));

vi.mock("@/lib/bookings/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bookings/service")>();
  return {
    ...actual,
    createBooking: mockCreateBooking,
  };
});

vi.mock("@/components/hubs/CollectiveHubList", () => ({
  default: function MockCollectiveHubList({
    onHubsChange,
  }: {
    onHubsChange?: (hubs: CollectiveHubLive[]) => void;
  }) {
    useEffect(() => {
      onHubsChange?.(mockHubs);
    }, [onHubsChange]);

    return <p>Turmas coletivas mockadas</p>;
  },
}));

vi.mock("@/components/tutor/IndividualSlotPicker", () => ({
  default: function MockIndividualSlotPicker({
    onSelectSlot,
  }: {
    onSelectSlot: (slot: Date | null) => void;
  }) {
    return (
      <button
        type="button"
        onClick={() => onSelectSlot(new Date("2026-09-08T19:00:00"))}
      >
        Escolher horário
      </button>
    );
  },
}));

const tutor = getTutorProfile("1")!;

function studentAuth() {
  return {
    user: { uid: "student-1" },
    userDoc: {
      role: "student" as const,
      displayName: "Ana Souza",
      email: "ana@test.com",
    },
    loading: false,
  };
}

describe("BookingWidget", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockCreateBooking.mockReset();
    mockJoinCollectiveClassAndBook.mockReset();
    mockPush.mockReset();
    mockTrackEvent.mockReset();
    mockUseAuth.mockReturnValue(studentAuth());
    mockCreateBooking.mockResolvedValue("booking-1");
    mockJoinCollectiveClassAndBook.mockResolvedValue("booking-1");
  });

  it("renders the booking card and collective option by default", async () => {
    render(<BookingWidget tutor={tutor} />);

    expect(screen.getByRole("heading", { name: "Agendar aula" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coletivo" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Agendar aula" })).toBeInTheDocument();
    expect(
      await screen.findByText((content, element) => {
        const text = element?.textContent ?? "";
        return (
          element?.tagName === "P" &&
          text.includes("Você está reservando") &&
          text.includes("Inglês para Viagem")
        );
      }),
    ).toBeInTheDocument();
  });

  it("switches to the individual lesson option", async () => {
    const user = userEvent.setup();
    render(<BookingWidget tutor={tutor} />);

    await user.click(screen.getByRole("button", { name: "Individual" }));

    expect(screen.getByRole("button", { name: "Individual" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Aula Individual (1-on-1)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Escolher horário" })).toBeInTheDocument();
  });

  it("sends unauthenticated students to login", async () => {
    mockUseAuth.mockReturnValue({ user: null, userDoc: null, loading: false });
    const user = userEvent.setup();
    render(<BookingWidget tutor={tutor} />);

    await screen.findByText((content, element) => {
      const text = element?.textContent ?? "";
      return element?.tagName === "P" && text.includes("Você está reservando");
    });
    await user.click(screen.getByRole("button", { name: "Agendar aula" }));

    expect(mockPush).toHaveBeenCalledWith("/login?next=%2Ftutor%2F1");
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it("blocks tutors from reserving a seat", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "tutor-1" },
      userDoc: { role: "tutor", displayName: "Mariana", email: "mariana@test.com" },
      loading: false,
    });
    const user = userEvent.setup();
    render(<BookingWidget tutor={tutor} />);

    await user.click(screen.getByRole("button", { name: "Agendar aula" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Apenas alunos podem reservar aulas.",
    );
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it("requires an individual slot before reserving", async () => {
    const user = userEvent.setup();
    render(<BookingWidget tutor={tutor} />);

    await user.click(screen.getByRole("button", { name: "Individual" }));
    await user.click(screen.getByRole("button", { name: "Agendar aula" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Selecione um horário disponível para continuar.",
    );
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it("creates a collective booking for a signed-in student", async () => {
    const user = userEvent.setup();
    render(<BookingWidget tutor={tutor} />);

    await screen.findByText((content, element) => {
      const text = element?.textContent ?? "";
      return element?.tagName === "P" && text.includes("Você está reservando");
    });
    await user.click(screen.getByRole("button", { name: "Agendar aula" }));

    await waitFor(() => {
      expect(mockJoinCollectiveClassAndBook).toHaveBeenCalledWith(
        "student-1",
        expect.objectContaining({
          tutorId: "1",
          price: 28,
          hubId: "hub-1",
        }),
      );
    });
    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Reserva enviada! Depois que o professor confirmar",
    );
    expect(mockTrackEvent).toHaveBeenCalledWith("booking_started", {
      tutor_id: "1",
      type: "coletivo",
    });
  });

  it("creates an individual booking after a slot is chosen", async () => {
    const user = userEvent.setup();
    render(<BookingWidget tutor={tutor} />);

    await user.click(screen.getByRole("button", { name: "Individual" }));
    await user.click(screen.getByRole("button", { name: "Escolher horário" }));
    await user.click(screen.getByRole("button", { name: "Agendar aula" }));

    await waitFor(() => {
      expect(mockCreateBooking).toHaveBeenCalledWith(
        "student-1",
        expect.objectContaining({
          tutorId: "1",
          type: "individual",
          price: tutor.individualPrice,
          scheduledAt: new Date("2026-09-08T19:00:00"),
        }),
      );
    });
    expect(mockTrackEvent).toHaveBeenCalledWith("booking_started", {
      tutor_id: "1",
      type: "individual",
    });
  });

  it("shows a Portuguese message when the individual slot was just taken", async () => {
    mockCreateBooking.mockRejectedValue(
      Object.assign(new Error("Esse horário acabou de ser reservado por outro aluno. Escolha outro horário."), {
        code: "SLOT_TAKEN",
      }),
    );
    const user = userEvent.setup();
    render(<BookingWidget tutor={tutor} />);

    await user.click(screen.getByRole("button", { name: "Individual" }));
    await user.click(screen.getByRole("button", { name: "Escolher horário" }));
    await user.click(screen.getByRole("button", { name: "Agendar aula" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esse horário acabou de ser reservado por outro aluno. Escolha outro horário.",
    );
  });

  it("hides the collective option when the tutor only offers individual lessons", () => {
    render(
      <BookingWidget
        tutor={{
          ...tutor,
          lessonTypes: ["individual"],
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Coletivo" })).not.toBeInTheDocument();
    expect(screen.getByText("Aula Individual (1-on-1)")).toBeInTheDocument();
  });

  it("explains when the booking cannot be created", async () => {
    mockJoinCollectiveClassAndBook.mockRejectedValue(Object.assign(new Error("full"), { code: "full" }));
    const user = userEvent.setup();
    render(<BookingWidget tutor={tutor} />);

    await screen.findByText((content, element) => {
      const text = element?.textContent ?? "";
      return element?.tagName === "P" && text.includes("Você está reservando");
    });
    await user.click(screen.getByRole("button", { name: "Agendar aula" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esta turma não tem mais vagas.",
    );
  });
});
