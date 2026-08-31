import { describe, expect, it } from "vitest";
import { generateMetadata } from "@/app/search/page";

describe("/search metadata", () => {
  it("indexes the clean search landing page", async () => {
    const metadata = await generateMetadata({ searchParams: {} });

    expect(metadata.title).toBe("Buscar Professores — Aprendiz Bay");
    expect(metadata.description).toMatch(/tutores verificados/);
    expect(metadata.alternates).toEqual({ canonical: "/search" });
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("does not index filtered result URLs", async () => {
    const metadata = await generateMetadata({
      searchParams: { q: "inglês", city: "São Paulo" },
    });

    expect(metadata.alternates).toEqual({ canonical: "/search" });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
