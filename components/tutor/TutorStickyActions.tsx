"use client";

import { Calendar, MessageCircle, Users } from "lucide-react";

interface TutorStickyActionsProps {
  showJoinClass?: boolean;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function TutorStickyActions({ showJoinClass = false }: TutorStickyActionsProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-7xl gap-2">
        <button
          type="button"
          onClick={() => scrollToId("agendar")}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary-600 px-3 text-sm font-semibold text-white shadow-soft"
        >
          <Calendar className="h-4 w-4" aria-hidden="true" />
          Agendar aula
        </button>
        <button
          type="button"
          onClick={() => scrollToId("mensagem")}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-primary-200 bg-primary-50 px-3 text-sm font-semibold text-primary-800"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Mensagem
        </button>
        {showJoinClass ? (
          <button
            type="button"
            onClick={() => scrollToId("turmas")}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-secondary-200 bg-secondary-50 px-3 text-sm font-semibold text-secondary-800"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Turma</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
