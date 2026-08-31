import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_TUTORS } from "@/lib/mock-tutors";

vi.mock("@/lib/tutors/server", () => ({
  fetchVerifiedTutorsServer: vi.fn(),
}));

import ProfessoresIndexPage, { metadata } from "@/app/professores/page";
import { okTutorList } from "@/lib/tutors/catalog";
import { fetchVerifiedTutorsServer } from "@/lib/tutors/server";

const fetchVerifiedTutorsServerMock = vi.mocked(fetchVerifiedTutorsServer);

describe("/professores", () => {
  beforeEach(() => {
    fetchVerifiedTutorsServerMock.mockReset();
  });

  it("publishes Brazilian Portuguese metadata with a canonical URL", () => {
    expect(metadata.title).toMatch(/Professores por matéria e cidade/);
    expect(metadata.description).toMatch(/Brasil/);
    expect(metadata.alternates).toEqual({ canonical: "/professores" });
  });

  it("lists only cities that actually have a tutor for that subject", async () => {
    fetchVerifiedTutorsServerMock.mockResolvedValue(okTutorList(MOCK_TUTORS));

    render(await ProfessoresIndexPage());

    expect(
      screen.getByRole("heading", { name: "Professores por matéria e cidade" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Inglês em São Paulo/ })).toHaveAttribute(
      "href",
      "/professores/ingles/sao-paulo",
    );
    expect(screen.queryByRole("link", { name: /Inglês em Curitiba/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Python em São Paulo/ })).not.toBeInTheDocument();
  });

  it("shows a useful empty state when there is no inventory", async () => {
    fetchVerifiedTutorsServerMock.mockResolvedValue(okTutorList([]));

    render(await ProfessoresIndexPage());

    expect(
      screen.getByText("Ainda não há professores verificados por matéria e cidade"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar professores" })).toHaveAttribute(
      "href",
      "/search",
    );
  });
});
