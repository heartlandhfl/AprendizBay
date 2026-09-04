import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RequireAuth from "@/components/auth/RequireAuth";

vi.mock("@/lib/auth/useRequireAuth", () => ({
  useRequireAuth: vi.fn(),
}));

import { useRequireAuth } from "@/lib/auth/useRequireAuth";

describe("Student dashboard access", () => {
  it("renders dashboard content for authorized students", () => {
    vi.mocked(useRequireAuth).mockReturnValue({
      user: { uid: "student-1" } as never,
      userDoc: { role: "student" } as never,
      loading: false,
      isAuthorized: true,
    });

    render(
      <RequireAuth roles={["student"]} unauthorizedRedirectTo="/tutor/dashboard">
        <div>Painel do aluno</div>
      </RequireAuth>,
    );

    expect(screen.getByText("Painel do aluno")).toBeInTheDocument();
    expect(useRequireAuth).toHaveBeenCalledWith({
      roles: ["student"],
      unauthorizedRedirectTo: "/tutor/dashboard",
    });
  });

  it("shows loading state while auth is resolving", () => {
    vi.mocked(useRequireAuth).mockReturnValue({
      user: null,
      userDoc: null,
      loading: true,
      isAuthorized: false,
    });

    render(
      <RequireAuth roles={["student"]}>
        <div>Painel do aluno</div>
      </RequireAuth>,
    );

    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(screen.queryByText("Painel do aluno")).not.toBeInTheDocument();
  });
});
