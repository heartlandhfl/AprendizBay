import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateHubForm from "@/components/hubs/CreateHubForm";

const { mockUseAuth, mockCreateCollectiveHub } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockCreateCollectiveHub: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/hubs/service", () => ({
  createCollectiveHub: mockCreateCollectiveHub,
}));

async function fillRequiredFields() {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText("Título"), "Inglês para Viagem");
  await user.type(
    screen.getByLabelText("Descrição"),
    "Frases essenciais para aeroporto e hotel.",
  );
  await user.type(screen.getByLabelText("Horário"), "Terças, 19h · Online");

  return user;
}

describe("CreateHubForm", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockCreateCollectiveHub.mockReset();
    mockUseAuth.mockReturnValue({
      user: { uid: "tutor-1" },
      userDoc: { role: "tutor", displayName: "Mariana", email: "mariana@test.com" },
      loading: false,
    });
    mockCreateCollectiveHub.mockResolvedValue("hub-1");
  });

  it("renders the collective hub fields", () => {
    render(<CreateHubForm />);

    expect(screen.getByRole("heading", { name: "Criar turma" })).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição")).toBeInTheDocument();
    expect(screen.getByLabelText("Máximo de alunos")).toBeInTheDocument();
    expect(screen.getByLabelText("Horário")).toBeInTheDocument();
    expect(screen.getByLabelText("Preço atual (R$/h)")).toBeInTheDocument();
    expect(screen.getByLabelText("Preço com turma cheia (R$/h)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar turma" })).toBeInTheDocument();
  });

  it("asks the tutor to sign in when there is no user", async () => {
    mockUseAuth.mockReturnValue({ user: null, userDoc: null, loading: false });
    render(<CreateHubForm />);

    const user = await fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Criar turma" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Faça login como professor para criar turmas.",
    );
    expect(mockCreateCollectiveHub).not.toHaveBeenCalled();
  });

  it("rejects a class size outside the 2–20 range", async () => {
    render(<CreateHubForm />);

    await fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Máximo de alunos"), {
      target: { value: "1" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Criar turma" }).closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "A turma deve ter entre 2 e 20 alunos.",
    );
    expect(mockCreateCollectiveHub).not.toHaveBeenCalled();
  });

  it("creates a hub and shows a success message", async () => {
    render(<CreateHubForm />);

    const user = await fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Presencial" }));
    await user.click(screen.getByRole("button", { name: "Criar turma" }));

    expect(mockCreateCollectiveHub).toHaveBeenCalledWith("tutor-1", {
      title: "Inglês para Viagem",
      description: "Frases essenciais para aeroporto e hotel.",
      maxStudents: 6,
      currentPrice: 25,
      fullPrice: 18,
      schedule: "Terças, 19h · Online",
      modality: "presencial",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Turma criada com sucesso!",
    );
    expect(screen.getByLabelText("Título")).toHaveValue("");
    expect(screen.getByLabelText("Descrição")).toHaveValue("");
    expect(screen.getByLabelText("Horário")).toHaveValue("");
  });

  it("shows an error when hub creation fails", async () => {
    mockCreateCollectiveHub.mockRejectedValue(new Error("permission-denied"));
    render(<CreateHubForm />);

    const user = await fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Criar turma" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível criar a turma.",
    );
  });
});
