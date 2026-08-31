import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConversationThread from "@/components/conversations/ConversationThread";
import { ConversationError } from "@/lib/conversations/errors";

const {
  authState,
  mockSendMessage,
  mockBlockUser,
  mockUnblockUser,
  mockReportConversation,
  mockSubscribeToConversation,
  mockSubscribeToMessages,
  mockSubscribeToPairBlock,
} = vi.hoisted(() => ({
  authState: {
    user: { uid: "student-1" },
    userDoc: { role: "student", displayName: "Ana Souza" },
    loading: false,
  },
  mockSendMessage: vi.fn(),
  mockBlockUser: vi.fn(),
  mockUnblockUser: vi.fn(),
  mockReportConversation: vi.fn(),
  mockSubscribeToConversation: vi.fn(),
  mockSubscribeToMessages: vi.fn(),
  mockSubscribeToPairBlock: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/conversations/service", () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
  blockUser: (...args: unknown[]) => mockBlockUser(...args),
  unblockUser: (...args: unknown[]) => mockUnblockUser(...args),
  reportConversation: (...args: unknown[]) => mockReportConversation(...args),
  subscribeToConversation: (...args: unknown[]) => mockSubscribeToConversation(...args),
  subscribeToConversationMessages: (...args: unknown[]) => mockSubscribeToMessages(...args),
  subscribeToPairBlock: (...args: unknown[]) => mockSubscribeToPairBlock(...args),
  formatMessageTime: () => "31/08/2026, 18:00",
}));

const conversation = {
  id: "student-1_tutor-1",
  studentId: "student-1",
  tutorId: "tutor-1",
  participantIds: ["student-1", "tutor-1"] as [string, string],
  studentName: "Ana Souza",
  tutorName: "Mariana Silva",
};

function emitDefaults() {
  mockSubscribeToConversation.mockImplementation((_id, onChange) => {
    onChange(conversation);
    return () => {};
  });
  mockSubscribeToMessages.mockImplementation((_id, onChange) => {
    onChange([]);
    return () => {};
  });
  mockSubscribeToPairBlock.mockImplementation((_userId, _otherId, onChange) => {
    onChange({ blockedByMe: false, blockedMe: false });
    return () => {};
  });
}

describe("ConversationThread", () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
    mockBlockUser.mockReset();
    mockUnblockUser.mockReset();
    mockReportConversation.mockReset();
    mockSubscribeToConversation.mockReset();
    mockSubscribeToMessages.mockReset();
    mockSubscribeToPairBlock.mockReset();
    mockSendMessage.mockResolvedValue("msg-1");
    mockBlockUser.mockResolvedValue(undefined);
    mockUnblockUser.mockResolvedValue(undefined);
    mockReportConversation.mockResolvedValue(undefined);
    emitDefaults();
  });

  it("warns before sending an obvious off-platform payment message", async () => {
    const user = userEvent.setup();
    render(<ConversationThread conversationId="student-1_tutor-1" />);

    await screen.findByRole("heading", { name: "Mariana Silva" });
    await user.type(
      screen.getByLabelText("Escreva sua mensagem"),
      "Meu pix é 550e8400-e29b-41d4-a716-446655440000",
    );
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText(/fora da Aprendiz Bay/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar mesmo assim" })).toBeInTheDocument();
    expect(mockSendMessage).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Enviar mesmo assim" }));
    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledTimes(1));
  });

  it("shows Denunciar conversa and Bloquear usuário actions", async () => {
    const user = userEvent.setup();
    render(<ConversationThread conversationId="student-1_tutor-1" />);

    await screen.findByRole("button", { name: "Denunciar conversa" });
    await user.click(screen.getByRole("button", { name: "Denunciar conversa" }));
    expect(screen.getByRole("dialog", { name: "Denunciar conversa" })).toBeInTheDocument();
    expect(
      screen.getByText(/não são abertas automaticamente para administradores/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Bloquear usuário" }));
    expect(screen.getByRole("dialog", { name: "Bloquear usuário?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    await waitFor(() =>
      expect(mockBlockUser).toHaveBeenCalledWith("student-1", "tutor-1"),
    );
  });

  it("hides the composer when the user is blocked", async () => {
    mockSubscribeToPairBlock.mockImplementation((_userId, _otherId, onChange) => {
      onChange({ blockedByMe: true, blockedMe: false });
      return () => {};
    });

    render(<ConversationThread conversationId="student-1_tutor-1" />);

    expect(
      await screen.findByText("Você bloqueou este usuário. Vocês não podem mais trocar mensagens."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Escreva sua mensagem")).not.toBeInTheDocument();
  });

  it("shows a blocked-user error from sendMessage", async () => {
    const user = userEvent.setup();
    mockSendMessage.mockRejectedValue(
      new ConversationError(
        "blocked",
        "Não é possível enviar mensagens porque um de vocês bloqueou o outro.",
      ),
    );

    render(<ConversationThread conversationId="student-1_tutor-1" />);
    await screen.findByLabelText("Escreva sua mensagem");
    await user.type(screen.getByLabelText("Escreva sua mensagem"), "Oi, professora!");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(
      await screen.findByText(
        "Não é possível enviar mensagens porque um de vocês bloqueou o outro.",
      ),
    ).toBeInTheDocument();
  });
});
