import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateHubForm from "@/components/hubs/CreateHubForm";

const { mockUseAuth, mockCreateCollectiveHub, mockUseTutorProfile } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockCreateCollectiveHub: vi.fn(),
  mockUseTutorProfile: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/hubs/service", () => ({
  createCollectiveHub: mockCreateCollectiveHub,
}));

vi.mock("@/lib/tutors/useTutorProfile", () => ({
  useTutorProfile: () => mockUseTutorProfile(),
}));

function approvedTutorProfile() {
  return {
    tutorDoc: {
      name: "Mariana Silva",
      subject: "Inglês",
      individualPrice: 70,
      collectivePrice: 25,
      isVerified: true,
      verificationStatus: "approved",
    },
    loading: false,
    isProfileComplete: true,
  };
}

async function fillRequiredFields() {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText("Tema / título"), "Inglês para Viagem");
  await user.type(
    screen.getByLabelText("Descrição"),
    "Frases essenciais para aeroporto e hotel.",
  );

  return user;
}

describe("CreateHubForm", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockCreateCollectiveHub.mockReset();
    mockUseTutorProfile.mockReset();
    mockUseAuth.mockReturnValue({
      user: { uid: "tutor-1", displayName: "Mariana Silva" },
      userDoc: { role: "tutor", displayName: "Mariana", email: "mariana@test.com" },
      loading: false,
    });
    mockUseTutorProfile.mockReturnValue(approvedTutorProfile());
    mockCreateCollectiveHub.mockResolvedValue("hub-1");
  });

  it("renders the collective hub fields", () => {
    render(<CreateHubForm />);

    expect(screen.getByRole("heading", { name: "Criar turma coletiva" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tema / título")).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição")).toBeInTheDocument();
    expect(screen.getByLabelText("Disciplina")).toBeInTheDocument();
    expect(screen.getByLabelText("Máximo de alunos")).toBeInTheDocument();
    expect(screen.getByLabelText("Data")).toBeInTheDocument();
    expect(screen.getByLabelText("Horário")).toBeInTheDocument();
    expect(screen.getByLabelText("Preço por aluno (R$/h)")).toBeInTheDocument();
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

  it("blocks unverified tutors from publishing a public class", async () => {
    mockUseTutorProfile.mockReturnValue({
      tutorDoc: {
        name: "Mariana Silva",
        subject: "Inglês",
        individualPrice: 70,
        collectivePrice: 25,
        isVerified: false,
        verificationStatus: "pending",
      },
      loading: false,
      isProfileComplete: true,
    });
    render(<CreateHubForm />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Seu perfil ainda não está aprovado",
    );
    expect(screen.getByRole("button", { name: "Criar turma" })).toBeDisabled();
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
    fireEvent.change(screen.getByLabelText("Data"), {
      target: { value: "2026-09-08" },
    });
    fireEvent.change(screen.getByLabelText("Horário"), {
      target: { value: "19:00" },
    });
    await user.click(screen.getByRole("button", { name: "Presencial" }));
    await user.click(screen.getByRole("button", { name: "Criar turma" }));

    expect(mockCreateCollectiveHub).toHaveBeenCalledWith(
      "tutor-1",
      expect.objectContaining({
        title: "Inglês para Viagem",
        description: "Frases essenciais para aeroporto e hotel.",
        maxStudents: 6,
        currentPrice: 25,
        modality: "presencial",
        subject: "Inglês",
        scheduledDate: "2026-09-08",
        startTime: "19:00",
        tutorName: "Mariana Silva",
        individualPrice: 70,
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Turma criada com sucesso!",
    );
    expect(screen.getByLabelText("Tema / título")).toHaveValue("");
    expect(screen.getByLabelText("Descrição")).toHaveValue("");
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
