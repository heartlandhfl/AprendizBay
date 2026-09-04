"use client";

import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import RequireAuth from "@/components/auth/RequireAuth";

export default function VerifyEmailContent() {
  return (
    <RequireAuth skipSetupGate skipEmailVerification>
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
          <Mail className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Confirme seu e-mail</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Enviamos um link de verificação para o seu e-mail. Abra a mensagem e clique no link para
          continuar usando o Aprendiz Bay.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Depois de confirmar, atualize esta página ou faça login novamente.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-primary-700"
          >
            Voltar ao login
          </Link>
        </div>
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
    </RequireAuth>
  );
}
