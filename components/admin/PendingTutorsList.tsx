"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, MapPin, RefreshCw } from "lucide-react";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";
import TutorAvatar from "@/components/tutor/TutorAvatar";
import CredentialDocumentPreview from "@/components/admin/CredentialDocumentPreview";
import type { AdminTutorApplication } from "@/lib/tutors/firestore-types";
import { formatTutorPrice, modalityLabel } from "@/lib/tutors/format";
import { fetchAdminTutorApplications } from "@/lib/tutors/client";
import { reviewTutorVerificationRequest } from "@/lib/tutors/review-client";
import {
  ACTION_LABELS,
  STATUS_LABELS,
  actionRequiresReason,
  canAdminTransition,
  type AdminReviewAction,
  type VerificationStatus,
} from "@/lib/tutors/verification";

const FILTERS: Array<{ id: "all" | VerificationStatus; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Em análise" },
  { id: "changes_requested", label: "Ajustes" },
  { id: "approved", label: "Aprovados" },
  { id: "rejected", label: "Recusados" },
  { id: "suspended", label: "Suspensos" },
];

const STATUS_BADGE: Record<VerificationStatus, string> = {
  pending: "bg-amber-50 text-amber-900 ring-amber-200",
  approved: "bg-primary-50 text-primary-800 ring-primary-200",
  rejected: "bg-red-50 text-red-800 ring-red-200",
  changes_requested: "bg-orange-50 text-orange-900 ring-orange-200",
  suspended: "bg-slate-100 text-slate-800 ring-slate-300",
};

const ACTION_STYLE: Record<AdminReviewAction, string> = {
  approve: "bg-primary-600 text-white hover:bg-primary-700",
  reject: "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
  request_changes: "border border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
  suspend: "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200",
};

const ACTION_COPY: Record<
  AdminReviewAction,
  { title: string; description: string; confirmClassName: string }
> = {
  approve: {
    title: "Aprovar professor?",
    description: "O perfil passará a aparecer na busca como professor verificado.",
    confirmClassName: "bg-primary-600 hover:bg-primary-700",
  },
  reject: {
    title: "Recusar verificação?",
    description: "O professor será avisado e não aparecerá na busca. Informe o motivo.",
    confirmClassName: "bg-red-600 hover:bg-red-700",
  },
  request_changes: {
    title: "Solicitar ajustes?",
    description: "O professor receberá o motivo e poderá reenviar o documento.",
    confirmClassName: "bg-amber-600 hover:bg-amber-700",
  },
  suspend: {
    title: "Suspender professor?",
    description: "O perfil sairá da busca imediatamente. Esta ação é reversível com uma nova aprovação.",
    confirmClassName: "bg-slate-800 hover:bg-slate-900",
  },
};

function availableActions(status: VerificationStatus): AdminReviewAction[] {
  return (["approve", "request_changes", "reject", "suspend"] as const).filter((action) =>
    canAdminTransition(status, action),
  );
}

export default function PendingTutorsList() {
  const [tutors, setTutors] = useState<AdminTutorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | VerificationStatus>("pending");
  const [pendingAction, setPendingAction] = useState<{
    tutor: AdminTutorApplication;
    action: AdminReviewAction;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadTutors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const applications = await fetchAdminTutorApplications();
      setTutors(applications);
    } catch {
      setError("Não foi possível carregar os professores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTutors();
  }, [loadTutors]);

  const visibleTutors = useMemo(() => {
    if (filter === "all") {
      return tutors;
    }
    return tutors.filter((tutor) => tutor.verificationStatus === filter);
  }, [filter, tutors]);

  function openAction(tutor: AdminTutorApplication, action: AdminReviewAction) {
    setPendingAction({ tutor, action });
    setReason("");
    setActionError(null);
  }

  async function confirmAction() {
    if (!pendingAction) {
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      const result = await reviewTutorVerificationRequest(
        pendingAction.tutor.id,
        pendingAction.action,
        reason,
      );

      setTutors((current) =>
        current.map((tutor) =>
          tutor.id === pendingAction.tutor.id
            ? {
                ...tutor,
                verificationStatus: result.status,
                isVerified: result.status === "approved",
                verificationReason: reason.trim() || undefined,
              }
            : tutor,
        ),
      );
      setPendingAction(null);
      setReason("");
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível atualizar a verificação.",
      );
    } finally {
      setSubmitting(false);
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
          <h1 className="text-2xl font-bold text-foreground">Verificação de professores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revise o perfil, o documento e decida se o professor pode aparecer na busca.
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

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por status">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === item.id
                ? "bg-primary-600 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {visibleTutors.length === 0 && !error ? (
        <div className="rounded-3xl bg-surface p-8 text-center shadow-soft ring-1 ring-border/60">
          <p className="text-sm text-muted-foreground">
            Nenhum professor neste status no momento.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {visibleTutors.map((tutor) => (
            <li
              key={tutor.id}
              className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60"
            >
              <div className="flex flex-col gap-6 lg:flex-row">
                <TutorAvatar name={tutor.name} src={tutor.avatarUrl} size="md" />

                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{tutor.name}</h2>
                      <p className="text-sm font-medium text-primary-600">{tutor.subject}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_BADGE[tutor.verificationStatus]}`}
                    >
                      {STATUS_LABELS[tutor.verificationStatus]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {tutor.city}, {tutor.state}
                    </span>
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

                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                      Documento de verificação
                    </h3>
                    <CredentialDocumentPreview
                      tutorId={tutor.id}
                      fileName={tutor.credentialFileName}
                    />
                  </div>

                  {tutor.verificationReason && (
                    <p className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-foreground">
                      <span className="font-medium">Último motivo: </span>
                      {tutor.verificationReason}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {availableActions(tutor.verificationStatus).map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => openAction(tutor, action)}
                        className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-colors ${ACTION_STYLE[action]}`}
                      >
                        {action === "approve" && <Check className="h-4 w-4" aria-hidden="true" />}
                        {ACTION_LABELS[action]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendingAction && (
        <ConfirmActionDialog
          title={ACTION_COPY[pendingAction.action].title}
          description={ACTION_COPY[pendingAction.action].description}
          confirmLabel={ACTION_LABELS[pendingAction.action]}
          confirmClassName={ACTION_COPY[pendingAction.action].confirmClassName}
          requireReason={actionRequiresReason(pendingAction.action)}
          reasonValue={reason}
          onReasonChange={setReason}
          submitting={submitting}
          error={actionError}
          onClose={() => {
            if (!submitting) {
              setPendingAction(null);
              setActionError(null);
            }
          }}
          onConfirm={() => void confirmAction()}
        />
      )}
    </section>
  );
}
