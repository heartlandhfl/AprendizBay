import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CategoryGrid from "@/components/home/CategoryGrid";

describe("CategoryGrid", () => {
  it("invites exploration without claiming student search volume", () => {
    render(<CategoryGrid />);

    expect(
      screen.getByText("Encontre professores nas matérias que você quer aprender"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/mais buscadas pelos nossos alunos/i)).not.toBeInTheDocument();
  });
});
