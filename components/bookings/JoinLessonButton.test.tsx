import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import JoinLessonButton from "@/components/bookings/JoinLessonButton";
import { generateMeetingUrl } from "@/lib/bookings/meeting";

const MISSING = "O link da reunião ainda não está disponível.";

describe("JoinLessonButton", () => {
  it("labels the join action as an external meeting", () => {
    render(
      <JoinLessonButton
        meetingUrl={generateMeetingUrl("booking-123")}
        missingMessage={MISSING}
      />,
    );

    const link = screen.getByRole("link", { name: "Entrar na aula (abre reunião externa)" });
    expect(link).toHaveAttribute("href", "https://meet.jit.si/aprendizbay-booking-123");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(/abre reunião externa/)).toBeInTheDocument();
  });

  it("shows a Portuguese message instead of a broken button when the URL is missing", () => {
    render(<JoinLessonButton meetingUrl={undefined} missingMessage={MISSING} />);

    expect(screen.getByRole("status")).toHaveTextContent(MISSING);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("does not render an unsafe meeting URL as a link", () => {
    render(
      <JoinLessonButton meetingUrl="javascript:alert(1)" missingMessage={MISSING} />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(MISSING);
  });
});
