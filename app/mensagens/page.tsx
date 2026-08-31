import { Suspense } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import ConversationInbox from "@/components/conversations/ConversationInbox";

export const metadata = {
  title: "Mensagens — Aprendiz Bay",
  description: "Converse com professores e alunos no Aprendiz Bay.",
  robots: { index: false, follow: false },
};

export default function MensagensPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <ConversationInbox />
        </div>
      </RequireAuth>
    </Suspense>
  );
}
