"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getOrCreateConversation } from "@/lib/conversations/service";

interface SendMessageButtonProps {
  tutorId: string;
  tutorName: string;
}

export default function SendMessageButton({
  tutorId,
  tutorName,
}: SendMessageButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userDoc, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && user.uid === tutorId) {
    return null;
  }

  async function handleSendMessage() {
    setError(null);

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (userDoc?.role !== "student") {
      setError("Apenas alunos podem enviar mensagens.");
      return;
    }

    setSubmitting(true);

    try {
      const conversationId = await getOrCreateConversation(user.uid, tutorId, {
        studentName: userDoc.displayName || user.displayName || "Aluno",
        tutorName,
      });
      router.push(`/mensagens/${conversationId}`);
    } catch {
      setError("Não foi possível iniciar a conversa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-border/50">
      <button
        type="button"
        onClick={handleSendMessage}
        disabled={submitting || authLoading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-800 transition-all duration-200 hover:bg-primary-100 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Abrindo conversa...
          </>
        ) : (
          <>
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Enviar mensagem
          </>
        )}
      </button>
      {error && (
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
