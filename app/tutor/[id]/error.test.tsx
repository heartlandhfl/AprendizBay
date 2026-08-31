import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TutorProfileError from "@/app/tutor/[id]/error";

describe("TutorProfileError", () => {
  it("lets the student retry or go back to search", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();

    render(
      <TutorProfileError error={Object.assign(new Error("fail"), { digest: "1" })} reset={reset} />,
    );

    expect(
      screen.getByRole("heading", { name: "Não foi possível carregar o perfil" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar professores" })).toHaveAttribute(
      "href",
      "/professores",
    );

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(reset).toHaveBeenCalled();
  });
});
