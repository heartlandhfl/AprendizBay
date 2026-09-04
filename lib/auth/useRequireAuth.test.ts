import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAccountSetupStatus } from "@/lib/auth/useAccountSetupStatus";

const { mockReplace } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/tutor/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/auth/useAccountSetupStatus", () => ({
  useAccountSetupStatus: vi.fn(),
}));

function mockAuth(overrides: {
  user?: { uid: string } | null;
  userDoc?: { role: string } | null;
  loading?: boolean;
  setupComplete?: boolean;
}) {
  const role = overrides.userDoc?.role;
  const setupComplete = overrides.setupComplete ?? true;

  vi.mocked(useAuth).mockReturnValue({
    user: (overrides.user ?? null) as never,
    userDoc: (overrides.userDoc ?? null) as never,
    loading: overrides.loading ?? false,
  });

  vi.mocked(useAccountSetupStatus).mockReturnValue({
    role: (role as "student" | "lecturer" | null) ?? null,
    userDoc: (overrides.userDoc ?? null) as never,
    learningProfile: setupComplete ? { preferredSubject: "Inglês", preferredModality: "online" } : {},
    tutorDoc: setupComplete && (role === "lecturer" || role === "tutor")
      ? ({
          userId: "tutor-1",
          name: "Professor",
          subject: "Matemática",
          city: "São Paulo",
          state: "SP",
          bio: "Professor com mais de dez anos de experiência.",
          avatarUrl: "https://example.com/avatar.jpg",
          individualPrice: 80,
          collectivePrice: 30,
          modality: "online",
          credentialFileName: "diploma.pdf",
          isVerified: false,
          isOnline: true,
          rating: 0,
          reviewCount: 0,
        } as never)
      : null,
    isComplete: setupComplete,
    setupPath: role === "student" ? "/account/setup" : "/tutor/onboarding",
    loading: false,
  });
}

describe("useRequireAuth", () => {
  beforeEach(() => {
    mockReplace.mockReset();
  });

  it("redirects unauthenticated visitors to login", async () => {
    mockAuth({ user: null, userDoc: null });

    renderHook(() => useRequireAuth({ roles: ["lecturer"] }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?redirect=%2Ftutor%2Fdashboard");
    });
  });

  it("authorizes canonical lecturer on lecturer-only routes", () => {
    mockAuth({ user: { uid: "lecturer-1" }, userDoc: { role: "lecturer" } });

    const { result } = renderHook(() => useRequireAuth({ roles: ["lecturer"] }));

    expect(result.current.isAuthorized).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("authorizes legacy tutor profiles on lecturer-only routes", () => {
    mockAuth({ user: { uid: "tutor-1" }, userDoc: { role: "tutor" } });

    const { result } = renderHook(() => useRequireAuth({ roles: ["lecturer"] }));

    expect(result.current.isAuthorized).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("rejects students from lecturer-only routes", async () => {
    mockAuth({ user: { uid: "student-1" }, userDoc: { role: "student" } });

    const { result } = renderHook(() => useRequireAuth({ roles: ["lecturer"] }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
    expect(result.current.isAuthorized).toBe(false);
  });

  it("rejects lecturers from student-only routes", async () => {
    mockAuth({ user: { uid: "lecturer-1" }, userDoc: { role: "lecturer" } });

    const { result } = renderHook(() =>
      useRequireAuth({ roles: ["student"], unauthorizedRedirectTo: "/" }),
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
    expect(result.current.isAuthorized).toBe(false);
  });

  it("does not treat admin as a lecturer", async () => {
    mockAuth({ user: { uid: "admin-1" }, userDoc: { role: "admin" } });

    renderHook(() => useRequireAuth({ roles: ["lecturer"] }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });
});
