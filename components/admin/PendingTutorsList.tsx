"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, MapPin, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Tutor } from "@/lib/mock-tutors";
import { approveTutorAction } from "@/lib/tutors/actions";
import { fetchUnverifiedTutors } from "@/lib/tutors/client";
import { formatTutorPrice, modalityLabel } from "@/lib/tutors/format";

export default function PendingTutorsList() {
  const { user } = useAuth();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadTutors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const pending = await fetchUnverifiedTutors();
      setTutors(pending);
    } catch {
      setError("Não foi possível carregar os professores pendentes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTutors();
  }, [loadTutors]);

  async function handleApprove(tutorId: string) {
    if (!user) {
      setActionError("Faça login como administrador para aprovar professores.");
      return;
    }

    setApprovingId(tutorId);
    setActionError(null);

    try {
      const idToken = await user.getIdToken();
      const result = await approveTutorAction(idToken, tutorId);

      if (!result.ok) {
        setActionError(result.error);
        return;
      }

      setTutors((current) => current.filter((tutor) => tutor.id !== tutorId));
    } catch {
      setActionError("Não foi possível aprovar o professor. Verifique se o servidor está configurado.");
    } finally {
      setApprovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Carregando professores...</span>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aprovação de professores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revise perfis enviados no onboarding e aprove para exibir na busca.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadTutors()}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Atualizar lista
        </button>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {actionError && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {actionError}
        </p>
      )}

      {tutors.length === 0 && !error ? (
        <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
          <p className="text-sm text-muted-foreground">
            Nenhum professor aguardando aprovação no momento.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {tutors.map((tutor) => (
            <li
              key={tutor.id}
              className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{tutor.name}</h2>
                    <p className="text-sm font-medium text-primary-600">{tutor.subject}</p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{tutor.city}, {tutor.state}</span>
                  </div>

                  <p className="text-sm leading-relaxed text-foreground">{tutor.bio}</p>

                  <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="font-medium text-muted-foreground">Individual</dt>
                      <dd className="mt-0.5 font-semibold text-foreground">
                        {formatTutorPrice(tutor.individualPrice)}/h
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Coletivo</dt>
                      <dd className="mt-0.5 font-semibold text-foreground">
                        {formatTutorPrice(tutor.collectivePrice)}/h
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Modalidade</dt>
                      <dd className="mt-0.5 font-semibold text-foreground">
                        {modalityLabel(tutor.modality)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <button
                  type="button"
                  onClick={() => void handleApprove(tutor.id)}
                  disabled={approvingId === tutor.id}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                >
                  {approvingId === tutor.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Aprovando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Aprovar
                    </>
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
