import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SearchResults from "@/components/search/SearchResults";

const {
  mockTrackEvent,
  mockFetchVerifiedTutors,
  mockFetchOpenCollectiveHubs,
  mockReplace,
  mockSearchParams,
} = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
  mockFetchVerifiedTutors: vi.fn(),
  mockFetchOpenCollectiveHubs: vi.fn(),
  mockReplace: vi.fn(),
  mockSearchParams: new URLSearchParams(),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

vi.mock("@/lib/tutors/client", () => ({
  fetchVerifiedTutors: mockFetchVerifiedTutors,
}));

vi.mock("@/lib/hubs/service", () => ({
  fetchOpenCollectiveHubs: mockFetchOpenCollectiveHubs,
  formatHubPrice: (price: number) =>
    price.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  usePathname: () => "/search",
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    userDoc: null,
  }),
}));

describe("SearchResults", () => {
  beforeEach(() => {
    mockTrackEvent.mockReset();
    mockFetchVerifiedTutors.mockReset();
    mockFetchOpenCollectiveHubs.mockReset();
    mockReplace.mockReset();
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key);
    }
    mockFetchVerifiedTutors.mockResolvedValue({ state: "empty", items: [] });
    mockFetchOpenCollectiveHubs.mockResolvedValue({ state: "empty", items: [] });
  });

  function renderSearch(initialSearchParams: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initialSearchParams)) {
      mockSearchParams.set(key, value);
    }

    return render(<SearchResults initialSearchParams={initialSearchParams} />);
  }

  it("tracks a results search using the query-string filters", async () => {
    renderSearch({ subject: "Inglês", modality: "online" });

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("search", {
        subject: "Inglês",
        city: "Todas as cidades",
        modality: "online",
        lesson_type: "todos",
        source: "results",
      });
    });
    expect(
      await screen.findByRole("heading", { name: "Resultados da Busca" }),
    ).toBeInTheDocument();
  });

  it("shows the landing title when no filters are active", async () => {
    renderSearch();

    expect(
      await screen.findByRole("heading", { name: "Encontre o professor ideal para você." }),
    ).toBeInTheDocument();
  });

  it("shows collective class cards next to tutors", async () => {
    mockFetchVerifiedTutors.mockResolvedValue({
      state: "ok",
      items: [
        {
          id: "1",
          name: "Mariana Silva",
          subject: "Inglês",
          city: "São Paulo",
          state: "SP",
          rating: 4.9,
          reviewCount: 10,
          bio: "Professora de inglês.",
          individualPrice: 70,
          collectivePrice: 25,
          modality: "online",
          lessonTypes: ["individual", "coletivo"],
          isOnline: true,
          avatarUrl: "https://example.com/a.png",
          avatarColor: "bg-emerald-100",
          isVerified: true,
        },
      ],
    });
    mockFetchOpenCollectiveHubs.mockResolvedValue({
      state: "ok",
      items: [
        {
          id: "hub-m1",
          title: "Inglês para Viagem — Primeiros Passos",
          description: "Frases essenciais.",
          confirmedStudents: 4,
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
          scheduledDate: "2026-09-08",
          startTime: "19:00",
          individualPrice: 70,
        },
      ],
    });

    renderSearch({ subject: "Inglês" });

    expect(await screen.findByRole("heading", { name: "Aulas coletivas" })).toBeInTheDocument();
    expect(screen.getByText("Inglês para Viagem — Primeiros Passos")).toBeInTheDocument();
    expect(screen.getByText("Vagas disponíveis: 2 de 6")).toBeInTheDocument();
    expect(screen.getByText(/Economia de 60% versus individual/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver turma" })).toHaveAttribute(
      "href",
      "/turmas/hub-m1",
    );
  });

  it("hides unapproved tutors even if they were returned by the client", async () => {
    mockFetchVerifiedTutors.mockResolvedValue({
      state: "ok",
      items: [
        {
          id: "pending",
          name: "Tutor Pendente",
          subject: "Inglês",
          city: "São Paulo",
          state: "SP",
          rating: 5,
          reviewCount: 1,
          bio: "Ainda em análise.",
          individualPrice: 50,
          collectivePrice: 20,
          modality: "online",
          lessonTypes: ["individual", "coletivo"],
          isOnline: true,
          avatarUrl: "https://example.com/a.png",
          avatarColor: "bg-emerald-100",
          isVerified: false,
        },
      ],
    });

    renderSearch({ subject: "Inglês" });

    expect(
      await screen.findByRole("heading", {
        name: "Nenhum professor encontrado com esses critérios.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Tutor Pendente")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver páginas por disciplina e cidade" }),
    ).toHaveAttribute("href", "/professores");
  });

  it("shows a Portuguese unavailable state instead of fictional tutors", async () => {
    mockFetchVerifiedTutors.mockResolvedValue({ state: "unavailable", items: [] });
    mockFetchOpenCollectiveHubs.mockResolvedValue({ state: "unavailable", items: [] });

    renderSearch();

    expect(
      await screen.findByRole("heading", { name: "Serviço temporariamente indisponível" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Não conseguimos carregar os professores agora. Tente novamente em alguns instantes."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mariana Silva")).not.toBeInTheDocument();
    expect(screen.queryByText("Lucas Ferreira")).not.toBeInTheDocument();
    expect(screen.queryByText("Inglês para Viagem — Primeiros Passos")).not.toBeInTheDocument();
  });

  it("shows a data error state without mock ratings or prices", async () => {
    mockFetchVerifiedTutors.mockResolvedValue({ state: "error", items: [] });
    mockFetchOpenCollectiveHubs.mockResolvedValue({ state: "empty", items: [] });

    renderSearch();

    expect(
      await screen.findByRole("heading", { name: "Erro ao carregar os professores" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mariana Silva")).not.toBeInTheDocument();
    expect(screen.queryByText("4,9")).not.toBeInTheDocument();
  });

  it("asks Firestore for the selected city and availability filters", async () => {
    renderSearch({
      subject: "Inglês",
      city: "São Paulo",
      modality: "online",
      available: "1",
    });

    await waitFor(() => {
      expect(mockFetchVerifiedTutors).toHaveBeenCalledWith({
        subject: "Inglês",
        city: "São Paulo",
        modality: "online",
        availableOnly: true,
      });
    });
  });

  it("passes the current search URL to tutor profile links", async () => {
    mockFetchVerifiedTutors.mockResolvedValue({
      state: "ok",
      items: [
        {
          id: "1",
          name: "Mariana Silva",
          subject: "Inglês",
          city: "São Paulo",
          state: "SP",
          rating: 4.9,
          reviewCount: 10,
          bio: "Professora de inglês.",
          individualPrice: 70,
          collectivePrice: 25,
          modality: "online",
          lessonTypes: ["individual"],
          isOnline: true,
          avatarUrl: "https://example.com/a.png",
          avatarColor: "bg-emerald-100",
          isVerified: true,
        },
      ],
    });

    renderSearch({ subject: "Inglês" });

    const profileLink = await screen.findByRole("link", { name: "Ver Perfil" });
    expect(profileLink).toHaveAttribute(
      "href",
      "/tutor/1?from=%2Fsearch%3Fsubject%3DIngl%C3%AAs",
    );
  });
});
