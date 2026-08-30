import { Suspense } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import ConversationThread from "@/components/conversations/ConversationThread";

interface ConversationPageProps {
  params: { conversationId: string };
}

export const metadata = {
  title: "Conversa — Aprendiz Bay",
  description: "Acompanhe a conversa entre aluno e professor.",
};

export default function ConversationPage({ params }: ConversationPageProps) {
  return (
    <Suspense fallback={null}>
      <RequireAuth>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <ConversationThread conversationId={params.conversationId} />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
