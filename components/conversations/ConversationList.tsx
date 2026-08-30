"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { otherParticipantName } from "@/lib/conversations/ids";
import {
  formatMessageTime,
  subscribeToUserConversations,
} from "@/lib/conversations/service";
import type { Conversation } from "@/lib/conversations/types";

export default function ConversationList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToUserConversations(
      user.uid,
      (nextConversations) => {
        setConversations(nextConversations);
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar suas mensagens.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando mensagens...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mensagens</h1>
        <p className="mt-2 text-muted-foreground">
          Converse com seus professores e alunos em um só lugar.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {conversations.length === 0 ? (
        <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
          <MessageCircle className="mx-auto h-8 w-8 text-primary-600" aria-hidden="true" />
          <p className="mt-4 text-lg font-semibold text-foreground">
            Nenhuma conversa ainda
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Abra o perfil de um professor e toque em Enviar mensagem para começar.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-flex rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
          >
            Encontrar um professor
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {conversations.map((conversation) => {
            const title = user
              ? otherParticipantName(conversation, user.uid)
              : "Conversa";

            return (
              <li key={conversation.id}>
                <Link
                  href={`/mensagens/${conversation.id}`}
                  className="block rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                    {conversation.lastMessageAt && (
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {formatMessageTime(conversation.lastMessageAt)}
                      </time>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {conversation.lastMessage || "Nenhuma mensagem ainda. Diga olá!"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
