"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import ConversationSafetyMenu from "@/components/conversations/ConversationSafetyMenu";
import { conversationErrorMessage } from "@/lib/conversations/errors";
import { otherParticipantId, otherParticipantName } from "@/lib/conversations/ids";
import { describeOffPlatformWarning, detectOffPlatformSignals } from "@/lib/conversations/moderation";
import {
  blockUser,
  formatMessageTime,
  reportConversation,
  sendMessage,
  subscribeToConversation,
  subscribeToConversationMessages,
  subscribeToPairBlock,
  unblockUser,
} from "@/lib/conversations/service";
import {
  MAX_MESSAGE_LENGTH,
  type BlockState,
  type Conversation,
  type ConversationMessage,
  type ConversationReportReason,
  type OffPlatformSignal,
} from "@/lib/conversations/types";

interface ConversationThreadProps {
  conversationId: string;
}

export default function ConversationThread({
  conversationId,
}: ConversationThreadProps) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [blockState, setBlockState] = useState<BlockState>({
    blockedByMe: false,
    blockedMe: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [pendingSignals, setPendingSignals] = useState<OffPlatformSignal[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let conversationReady = false;
    let messagesReady = false;

    function markLoaded() {
      if (conversationReady && messagesReady) {
        setLoading(false);
      }
    }

    const unsubscribeConversation = subscribeToConversation(
      conversationId,
      (nextConversation) => {
        setConversation(nextConversation);
        conversationReady = true;
        markLoaded();
      },
      () => {
        setError("Você não tem acesso a esta conversa.");
        conversationReady = true;
        messagesReady = true;
        setLoading(false);
      },
    );

    const unsubscribeMessages = subscribeToConversationMessages(
      conversationId,
      (nextMessages) => {
        setMessages(nextMessages);
        messagesReady = true;
        markLoaded();
      },
      () => {
        setError("Não foi possível carregar as mensagens.");
        conversationReady = true;
        messagesReady = true;
        setLoading(false);
      },
    );

    return () => {
      unsubscribeConversation();
      unsubscribeMessages();
    };
  }, [conversationId, user]);

  useEffect(() => {
    if (!user || !conversation) {
      return;
    }

    return subscribeToPairBlock(
      user.uid,
      otherParticipantId(conversation, user.uid),
      setBlockState,
    );
  }, [conversation, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const title = user && conversation ? otherParticipantName(conversation, user.uid) : "Conversa";
  const otherId = user && conversation ? otherParticipantId(conversation, user.uid) : "";
  const messagingBlocked = blockState.blockedByMe || blockState.blockedMe;
  const offPlatformWarning = describeOffPlatformWarning(pendingSignals);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || sending || messagingBlocked) {
      return;
    }

    const text = draft.trim();
    if (!text) {
      return;
    }

    const signals = detectOffPlatformSignals(text);
    if (signals.length > 0 && pendingSignals.join() !== signals.join()) {
      setPendingSignals(signals);
      setError(null);
      return;
    }

    setSending(true);
    setError(null);

    try {
      await sendMessage(conversationId, user.uid, text);
      setDraft("");
      setPendingSignals([]);
    } catch (sendError) {
      setError(conversationErrorMessage(sendError, "Não foi possível enviar a mensagem."));
    } finally {
      setSending(false);
    }
  }

  async function handleReport(reason: ConversationReportReason, details: string) {
    if (!user || !otherId) {
      return;
    }

    setActionBusy(true);
    setActionError(null);

    try {
      await reportConversation({
        conversationId,
        reporterId: user.uid,
        reportedUserId: otherId,
        reason,
        details,
      });
    } catch (reportError) {
      setActionError(conversationErrorMessage(reportError, "Não foi possível enviar a denúncia."));
      throw reportError;
    } finally {
      setActionBusy(false);
    }
  }

  async function handleBlock() {
    if (!user || !otherId) {
      return;
    }

    setActionBusy(true);
    setActionError(null);

    try {
      await blockUser(user.uid, otherId);
    } catch (blockError) {
      setActionError(conversationErrorMessage(blockError, "Não foi possível bloquear este usuário."));
      throw blockError;
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUnblock() {
    if (!user || !otherId) {
      return;
    }

    setActionBusy(true);
    setActionError(null);

    try {
      await unblockUser(user.uid, otherId);
    } catch (unblockError) {
      setActionError(
        conversationErrorMessage(unblockError, "Não foi possível desbloquear este usuário."),
      );
      throw unblockError;
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando conversa...</span>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="space-y-6">
        <Link
          href="/mensagens"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar às mensagens
        </Link>
        <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
          <h1 className="text-xl font-bold text-foreground">Conversa não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "Esta conversa não existe ou você não tem permissão para vê-la."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <Link
        href="/mensagens"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar às mensagens
      </Link>

      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-surface shadow-soft-lg ring-1 ring-border/60">
        <header className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Mensagens
            </p>
            <h1 className="mt-1 text-xl font-bold text-foreground">{title}</h1>
          </div>
          <ConversationSafetyMenu
            otherName={title}
            blockedByMe={blockState.blockedByMe}
            submitting={actionBusy}
            error={actionError}
            onReport={handleReport}
            onBlock={handleBlock}
            onUnblock={handleUnblock}
          />
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <p className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Envie a primeira para começar a conversa.
            </p>
          ) : (
            messages.map((message) => {
              const isMine = message.senderId === user?.uid;

              return (
                <article
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    isMine
                      ? "ml-auto bg-primary-600 text-white"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  {message.createdAt && (
                    <time
                      className={`mt-1 block text-[11px] ${
                        isMine ? "text-white/80" : "text-muted-foreground"
                      }`}
                    >
                      {formatMessageTime(message.createdAt)}
                    </time>
                  )}
                </article>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="mx-5 mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {messagingBlocked ? (
          <p className="mx-5 mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
            {blockState.blockedByMe
              ? "Você bloqueou este usuário. Vocês não podem mais trocar mensagens."
              : "Esta conversa está bloqueada. Vocês não podem mais trocar mensagens."}
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-3 border-t border-border/60 p-4"
          >
            {offPlatformWarning && (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
                <p>{offPlatformWarning}</p>
                <p className="mt-2 font-medium">
                  Revise o texto ou toque em Enviar mesmo assim para continuar.
                </p>
              </div>
            )}
            <div className="flex items-end gap-2">
              <label htmlFor="mensagem" className="sr-only">
                Escreva sua mensagem
              </label>
              <textarea
                id="mensagem"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setPendingSignals([]);
                }}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={2}
                placeholder="Escreva sua mensagem..."
                className="min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                {pendingSignals.length > 0 ? "Enviar mesmo assim" : "Enviar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
