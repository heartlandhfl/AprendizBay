import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ValueProposition from "@/components/home/ValueProposition";

describe("ValueProposition", () => {
  it("describes collective savings without an invented percentage", () => {
    render(<ValueProposition />);

    expect(
      screen.getByText(
        "Divida o valor com a galera. Forme um grupo ou entre em turmas abertas e pague menos em cada aula.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/até 60%/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Tutores locais e online com perfil verificado e avaliações de quem já fez aula.",
      ),
    ).toBeInTheDocument();
  });
});
