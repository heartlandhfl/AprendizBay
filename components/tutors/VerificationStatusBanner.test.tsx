import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VerificationStatusBanner from "@/components/tutors/VerificationStatusBanner";

const { mockUseTutorProfile } = vi.hoisted(() => ({
  mockUseTutorProfile: vi.fn(),
}));

vi.mock("@/lib/tutors/useTutorProfile", () => ({
  useTutorProfile: () => mockUseTutorProfile(),
}));

describe("VerificationStatusBanner", () => {
  beforeEach(() => {
    mockUseTutorProfile.mockReset();
  });

  it("tells a pending tutor they will not appear as verified", () => {
    mockUseTutorProfile.mockReturnValue({
      loading: false,
      isProfileComplete: true,
      tutorDoc: { verificationStatus: "pending", isVerified: false },
    });

    render(<VerificationStatusBanner />);

    expect(screen.getByRole("heading", { name: "Verificação em análise" })).toBeInTheDocument();
    expect(screen.getByText(/não aparecerá na busca/i)).toBeInTheDocument();
  });

  it("shows the rejection reason and a path to resubmit", () => {
    mockUseTutorProfile.mockReturnValue({
      loading: false,
      isProfileComplete: true,
      tutorDoc: {
        verificationStatus: "rejected",
        isVerified: false,
        verificationReason: "Documento vencido.",
      },
    });

    render(<VerificationStatusBanner />);

    expect(screen.getByRole("heading", { name: "Verificação recusada" })).toBeInTheDocument();
    expect(screen.getByText(/Documento vencido/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Atualizar documento" })).toHaveAttribute(
      "href",
      "/tutor/settings",
    );
  });

  it("explains that a suspended tutor left the marketplace", () => {
    mockUseTutorProfile.mockReturnValue({
      loading: false,
      isProfileComplete: true,
      tutorDoc: {
        verificationStatus: "suspended",
        isVerified: false,
        verificationReason: "Denúncia confirmada.",
      },
    });

    render(<VerificationStatusBanner />);

    expect(screen.getByRole("heading", { name: "Perfil suspenso" })).toBeInTheDocument();
    expect(screen.getByText(/não aparece mais na busca/)).toBeInTheDocument();
  });
});
