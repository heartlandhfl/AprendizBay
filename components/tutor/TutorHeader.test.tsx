import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TutorHeader from "@/components/tutor/TutorHeader";
import type { TutorProfile } from "@/lib/tutor-profiles";

vi.mock("@/components/tutor/TutorRatingStats", () => ({
  default: function MockRatingStats({
    initialReviewCount,
  }: {
    initialReviewCount: number;
  }) {
    return (
      <span>
        {initialReviewCount > 0 ? `${initialReviewCount} avaliações` : "Ainda sem avaliações"}
      </span>
    );
  },
}));

function makeTutor(overrides: Partial<TutorProfile> = {}): TutorProfile {
  return {
    id: "1",
    name: "Mariana Silva",
    subject: "Inglês",
    city: "São Paulo",
    state: "SP",
    rating: 0,
    reviewCount: 0,
    bio: "Professora de inglês",
    individualPrice: 70,
    collectivePrice: 25,
    modality: "ambos",
    lessonTypes: ["individual", "coletivo"],
    isOnline: false,
    avatarUrl: "",
    avatarColor: "bg-emerald-100",
    isVerified: false,
    collectiveHubs: [],
    ...overrides,
  };
}

describe("TutorHeader", () => {
  it("shows name, city, modality and initials when there is no photo", () => {
    render(<TutorHeader tutor={makeTutor()} />);

    expect(screen.getByRole("heading", { name: "Mariana Silva" })).toBeInTheDocument();
    expect(screen.getByText("São Paulo, SP")).toBeInTheDocument();
    expect(screen.getByText("Online e presencial")).toBeInTheDocument();
    expect(screen.getByText("MS")).toBeInTheDocument();
    expect(screen.queryByText("Professor verificado")).not.toBeInTheDocument();
    expect(screen.queryByText(/Responde em/)).not.toBeInTheDocument();
  });

  it("shows the verified badge and response time only when those values exist", () => {
    render(
      <TutorHeader
        tutor={makeTutor({
          isVerified: true,
          responseTime: "3 horas",
          headline: "Inglês para viagens",
          avatarUrl: "https://example.com/mariana.jpg",
        })}
      />,
    );

    expect(screen.getByText("Professor verificado")).toBeInTheDocument();
    expect(screen.getByText("Responde em 3 horas")).toBeInTheDocument();
    expect(screen.getByText("Inglês para viagens")).toBeInTheDocument();
    expect(screen.getByAltText("Foto de perfil de Mariana Silva")).toBeInTheDocument();
  });
});
