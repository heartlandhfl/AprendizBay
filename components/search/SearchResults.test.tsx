import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SearchResults from "@/components/search/SearchResults";

const { mockTrackEvent, mockFetchVerifiedTutors, mockFetchOpenCollectiveHubs } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
  mockFetchVerifiedTutors: vi.fn(),
  mockFetchOpenCollectiveHubs: vi.fn(),
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

describe("SearchResults", () => {
  beforeEach(() => {
    mockTrackEvent.mockReset();
    mockFetchVerifiedTutors.mockReset();
    mockFetchOpenCollectiveHubs.mockReset();
    mockFetchVerifiedTutors.mockResolvedValue({ state: "empty", items: [] });
    mockFetchOpenCollectiveHubs.mockResolvedValue({ state: "empty", items: [] });
  });

  it("tracks a results search using the query-string filters", async () => {
    render(<SearchResults initialQuery="Inglês" initialModality="online" />);

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

    render(<SearchResults initialQuery="Inglês" />);

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

    render(<SearchResults initialQuery="Inglês" />);

    expect(
      await screen.findByRole("heading", { name: "Nenhum professor de Inglês com esses filtros" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Tutor Pendente")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver páginas por disciplina e cidade" }),
    ).toHaveAttribute("href", "/professores");
  });

  it("shows a Portuguese unavailable state instead of fictional tutors", async () => {
    mockFetchVerifiedTutors.mockResolvedValue({ state: "unavailable", items: [] });
    mockFetchOpenCollectiveHubs.mockResolvedValue({ state: "unavailable", items: [] });

    render(<SearchResults />);

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

    render(<SearchResults />);

    expect(
      await screen.findByRole("heading", { name: "Erro ao carregar os professores" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mariana Silva")).not.toBeInTheDocument();
    expect(screen.queryByText("4,9")).not.toBeInTheDocument();
  });

  it("asks Firestore for the selected city instead of downloading every tutor", async () => {
    render(<SearchResults initialQuery="Inglês" initialCity="São Paulo" />);

    await waitFor(() => {
      expect(mockFetchVerifiedTutors).toHaveBeenCalledWith({
        subject: "Inglês",
        city: "São Paulo",
      });
    });
  });
});
