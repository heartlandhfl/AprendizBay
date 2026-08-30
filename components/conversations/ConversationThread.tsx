"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { otherParticipantName } from "@/lib/conversations/ids";
import {
  formatMessageTime,
  sendMessage,
  subscribeToConversation,
  subscribeToConversationMessages,
} from "@/lib/conversations/service";
import {
  MAX_MESSAGE_LENGTH,
  type Conversation,
  type ConversationMessage,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || sending) {
      return;
    }

    const text = draft.trim();
    if (!text) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      await sendMessage(conversationId, user.uid, text);
      setDraft("");
    } catch {
      setError("Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
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

  const title = user ? otherParticipantName(conversation, user.uid) : "Conversa";

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
        <header className="border-b border-border/60 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Mensagens
          </p>
          <h1 className="mt-1 text-xl font-bold text-foreground">{title}</h1>
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

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 border-t border-border/60 p-4"
        >
          <label htmlFor="mensagem" className="sr-only">
            Escreva sua mensagem
          </label>
          <textarea
            id="mensagem"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
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
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
