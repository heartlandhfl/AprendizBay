import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PendingTutorsList from "@/components/admin/PendingTutorsList";
import type { AdminTutorApplication } from "@/lib/tutors/firestore-types";

const { mockFetchApplications, mockReviewRequest } = vi.hoisted(() => ({
  mockFetchApplications: vi.fn(),
  mockReviewRequest: vi.fn(),
}));

vi.mock("@/lib/tutors/client", () => ({
  fetchAdminTutorApplications: () => mockFetchApplications(),
}));

vi.mock("@/lib/tutors/review-client", () => ({
  reviewTutorVerificationRequest: (...args: unknown[]) => mockReviewRequest(...args),
}));

vi.mock("@/components/admin/CredentialDocumentPreview", () => ({
  default: ({ fileName }: { fileName?: string }) => (
    <p>{fileName ? `Documento: ${fileName}` : "Nenhum documento enviado."}</p>
  ),
}));

const pendingTutor: AdminTutorApplication = {
  id: "tutor-1",
  name: "Mariana Silva",
  subject: "Inglês",
  city: "São Paulo",
  state: "SP",
  bio: "Professora certificada Cambridge com foco em conversação.",
  individualPrice: 70,
  collectivePrice: 25,
  modality: "ambos",
  avatarUrl: "https://example.com/mariana.jpg",
  credentialFileName: "documento-1.pdf",
  verificationStatus: "pending",
  isVerified: false,
};

describe("PendingTutorsList", () => {
  beforeEach(() => {
    mockFetchApplications.mockReset();
    mockReviewRequest.mockReset();
    mockFetchApplications.mockResolvedValue([pendingTutor]);
    mockReviewRequest.mockResolvedValue({ status: "approved" });
  });

  it("shows the review fields required by the admin workflow", async () => {
    render(<PendingTutorsList />);

    expect(await screen.findByRole("heading", { name: "Verificação de professores" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mariana Silva" })).toBeInTheDocument();
    expect(screen.getByText("Inglês")).toBeInTheDocument();
    expect(screen.getByText("São Paulo, SP")).toBeInTheDocument();
    expect(screen.getByText(/Professora certificada Cambridge/)).toBeInTheDocument();
    expect(screen.getByText("Online e presencial")).toBeInTheDocument();
    expect(screen.getByText("Documento: documento-1.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recusar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Solicitar ajustes" })).toBeInTheDocument();
  });

  it("asks for confirmation before a destructive action", async () => {
    const user = userEvent.setup();
    render(<PendingTutorsList />);

    await screen.findByRole("button", { name: "Recusar" });
    await user.click(screen.getByRole("button", { name: "Recusar" }));

    const dialog = screen.getByRole("dialog", { name: "Recusar verificação?" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Informe o motivo/)).toBeInTheDocument();

    await user.type(
      within(dialog).getByRole("textbox"),
      "O documento enviado está ilegível.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Recusar" }));

    expect(mockReviewRequest).toHaveBeenCalledWith(
      "tutor-1",
      "reject",
      "O documento enviado está ilegível.",
    );
  });
});
