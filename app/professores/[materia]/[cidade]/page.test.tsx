import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_TUTORS } from "@/lib/mock-tutors";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/lib/tutors/server", () => ({
  fetchVerifiedTutorsServer: vi.fn(),
}));

import SubjectCityPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/professores/[materia]/[cidade]/page";
import { okTutorList } from "@/lib/tutors/catalog";
import { fetchVerifiedTutorsServer } from "@/lib/tutors/server";

const fetchVerifiedTutorsServerMock = vi.mocked(fetchVerifiedTutorsServer);

describe("/professores/[materia]/[cidade]", () => {
  beforeEach(() => {
    fetchVerifiedTutorsServerMock.mockReset();
    fetchVerifiedTutorsServerMock.mockResolvedValue(okTutorList(MOCK_TUTORS));
  });

  it("prerenders only pairs with local inventory", async () => {
    const params = await generateStaticParams();
    const keys = params.map((item) => `${item.materia}/${item.cidade}`);

    expect(keys).toContain("ingles/sao-paulo");
    expect(keys).not.toContain("ingles/curitiba");
  });

  it("indexes a city page that has a real local tutor", async () => {
    const metadata = await generateMetadata({
      params: { materia: "ingles", cidade: "sao-paulo" },
    });

    expect(metadata.title).toBe("Professores de Inglês em São Paulo | Aprendiz Bay");
    expect(metadata.description).toContain("Encontre professores de inglês em São Paulo");
    expect(metadata.alternates).toEqual({ canonical: "/professores/ingles/sao-paulo" });
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("does not index a city page with no local tutors", async () => {
    const metadata = await generateMetadata({
      params: { materia: "ingles", cidade: "curitiba" },
    });

    expect(metadata.title).toContain("em breve");
    expect(metadata.description).toContain("Ainda não há professores de inglês em Curitiba");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("renders the local tutor on a representative inventory page", async () => {
    render(
      await SubjectCityPage({ params: { materia: "ingles", cidade: "sao-paulo" } }),
    );

    expect(
      screen.getByRole("heading", { name: "Professores de Inglês em São Paulo" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mariana Silva")).toBeInTheDocument();
    expect(
      screen.queryByText(/Ainda não temos professores de inglês em São Paulo/),
    ).not.toBeInTheDocument();
  });

  it("renders Brazilian Portuguese empty-state copy when the city has no tutor", async () => {
    render(
      await SubjectCityPage({ params: { materia: "ingles", cidade: "curitiba" } }),
    );

    expect(
      screen.getByText("Ainda não temos professores de inglês em Curitiba"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mariana Silva")).toBeInTheDocument();
    expect(screen.getByText(/não estão em Curitiba/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Buscar inglês online/ })).toHaveAttribute(
      "href",
      "/search?subject=Ingl%C3%AAs",
    );
  });

  it("returns 404 for an unknown subject or city", async () => {
    await expect(
      SubjectCityPage({ params: { materia: "frances", cidade: "recife" } }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
