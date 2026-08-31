import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Timestamp } from "firebase/firestore";
import LessonExperience from "@/components/lessons/LessonExperience";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Booking } from "@/lib/bookings/types";
import { generateMeetingUrl } from "@/lib/bookings/meeting";
import {
  fetchTutorLessonDetails,
  fetchUserDisplayName,
  subscribeToBooking,
} from "@/lib/bookings/service";

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/bookings/service", () => ({
  subscribeToBooking: vi.fn(),
  fetchTutorLessonDetails: vi.fn(),
  fetchUserDisplayName: vi.fn(),
  markBookingCompleted: vi.fn(),
}));

vi.mock("@/lib/hubs/service", () => ({
  fetchHub: vi.fn(async () => null),
}));

const PAST = {
  toDate: () => new Date("2026-08-30T19:00:00.000Z"),
  toMillis: () => Date.parse("2026-08-30T19:00:00.000Z"),
} as Timestamp;

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-123",
    studentId: "student-1",
    tutorId: "tutor-1",
    type: "individual",
    status: "confirmed",
    price: 80,
    platformFee: 8,
    tutorAmount: 72,
    scheduledAt: PAST,
    createdAt: PAST,
    meetingUrl: generateMeetingUrl("booking-123"),
    paymentStatus: "paid",
    paymentId: "pay_secret_080225913252",
    asaasCheckoutId: "checkout_secret",
    refundId: "refund_secret",
    ...overrides,
  };
}

function mockAuth(uid: string, role: "student" | "tutor") {
  vi.mocked(useAuth).mockReturnValue({
    user: { uid } as never,
    userDoc: { role, displayName: "Usuário", email: "user@test.com" } as never,
    loading: false,
  });
}

describe("LessonExperience authorization and meeting URL", () => {
  beforeEach(() => {
    vi.mocked(fetchTutorLessonDetails).mockResolvedValue({
      name: "Mariana Silva",
      subject: "Inglês",
      modality: "online",
    });
    vi.mocked(fetchUserDisplayName).mockResolvedValue("Ana Souza");
  });

  it("does not expose another user's lesson details when access is denied", async () => {
    mockAuth("student-2", "student");
    vi.mocked(subscribeToBooking).mockImplementation((_id, _onChange, onError) => {
      onError?.(new Error("Missing or insufficient permissions."));
      return () => {};
    });

    render(<LessonExperience bookingId="booking-secret" />);

    expect(await screen.findByRole("heading", { name: "Aula indisponível" })).toBeInTheDocument();
    expect(
      screen.getByText("Esta aula não existe ou você não tem permissão para vê-la."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mariana Silva")).not.toBeInTheDocument();
    expect(screen.queryByText("Ana Souza")).not.toBeInTheDocument();
    expect(screen.queryByText("pay_secret_080225913252")).not.toBeInTheDocument();
    expect(screen.queryByText("Inglês")).not.toBeInTheDocument();
  });

  it("does not render a booking that belongs to another student even if it is returned", async () => {
    mockAuth("student-2", "student");
    vi.mocked(subscribeToBooking).mockImplementation((_id, onChange) => {
      onChange(booking());
      return () => {};
    });

    render(<LessonExperience bookingId="booking-123" />);

    expect(await screen.findByRole("heading", { name: "Aula indisponível" })).toBeInTheDocument();
    expect(screen.queryByText("Mariana Silva")).not.toBeInTheDocument();
    expect(screen.queryByText("pay_secret_080225913252")).not.toBeInTheDocument();
    expect(fetchTutorLessonDetails).not.toHaveBeenCalled();
  });

  it("shows a Portuguese message instead of a join link when the meeting URL is missing", async () => {
    mockAuth("student-1", "student");
    vi.mocked(subscribeToBooking).mockImplementation((_id, onChange) => {
      onChange(booking({ meetingUrl: undefined }));
      return () => {};
    });

    render(<LessonExperience bookingId="booking-123" />);

    await waitFor(() => {
      expect(screen.getByText("Mariana Silva")).toBeInTheDocument();
    });

    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("Nome do professor")).toBeInTheDocument();
    expect(screen.getByText("Nome do aluno")).toBeInTheDocument();
    expect(screen.getByText("Disciplina")).toBeInTheDocument();
    expect(screen.getAllByText("Confirmada").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent(/ainda não está disponível/);
    expect(screen.queryByRole("link", { name: /entrar na aula/i })).not.toBeInTheDocument();
    expect(screen.queryByText("pay_secret_080225913252")).not.toBeInTheDocument();
    expect(screen.queryByText("checkout_secret")).not.toBeInTheDocument();
  });

  it("lets the student of the booking open the validated external meeting", async () => {
    mockAuth("student-1", "student");
    vi.mocked(subscribeToBooking).mockImplementation((_id, onChange) => {
      onChange(booking());
      return () => {};
    });

    render(<LessonExperience bookingId="booking-123" />);

    const link = await screen.findByRole("link", {
      name: "Entrar na aula (abre reunião externa)",
    });
    expect(link).toHaveAttribute("href", generateMeetingUrl("booking-123"));
    expect(screen.queryByRole("button", { name: "Marcar aula como concluída" })).not.toBeInTheDocument();
  });

  it("shows the complete button to the tutor after the scheduled time", async () => {
    mockAuth("tutor-1", "tutor");
    vi.mocked(subscribeToBooking).mockImplementation((_id, onChange) => {
      onChange(booking());
      return () => {};
    });

    render(<LessonExperience bookingId="booking-123" />);

    expect(
      await screen.findByRole("button", { name: "Marcar aula como concluída" }),
    ).toBeEnabled();
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
  });
});
