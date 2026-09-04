"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AvatarUpload from "@/components/uploads/AvatarUpload";
import { useAuth } from "@/lib/auth/AuthContext";
import { updateStudentAccountBasics } from "@/lib/auth/account-post-login";
import type { Modality } from "@/lib/mock-tutors";
import { BRAZILIAN_STATES } from "@/lib/tutors/constants";
import { EDUCATION_LEVELS } from "@/lib/tutors/search";
import { saveStudentLearningProfile } from "@/lib/student-dashboard/preferences";
import {
  LEARNING_OBJECTIVES,
  type StudentLearningProfile,
} from "@/lib/student-dashboard/types";

const INPUT_CLASS =
  "h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200";

const SELECT_CLASS =
  "h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-200";

const MODALITY_OPTIONS: Array<{ value: Modality; label: string }> = [
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial" },
  { value: "ambos", label: "Online e presencial" },
];

const TOTAL_STEPS = 2;

interface StudentAccountSetupFormProps {
  initialProfile: StudentLearningProfile;
}

export default function StudentAccountSetupForm({
  initialProfile,
}: StudentAccountSetupFormProps) {
  const router = useRouter();
  const { user, userDoc } = useAuth();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(userDoc?.displayName ?? user?.displayName ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(userDoc?.photoUrl ?? null);
  const [city, setCity] = useState(initialProfile.city ?? "");
  const [state, setState] = useState(initialProfile.state ?? "SP");
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [preferredSubject, setPreferredSubject] = useState(initialProfile.preferredSubject ?? "");
  const [preferredLevel, setPreferredLevel] = useState(initialProfile.preferredLevel ?? "");
  const [preferredModality, setPreferredModality] = useState<Modality | "">(
    initialProfile.preferredModality ?? "",
  );
  const [preferredCity, setPreferredCity] = useState(initialProfile.preferredCity ?? "");
  const [learningObjective, setLearningObjective] = useState(
    initialProfile.learningObjective ?? "",
  );
  const [customObjective, setCustomObjective] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace("/dashboard");
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [router, saved]);

  function validateStep(currentStep: number): string | null {
    if (currentStep === 0) {
      if (!displayName.trim()) {
        return "Informe seu nome completo.";
      }
      if (!city.trim()) {
        return "Informe sua cidade.";
      }
      if (!state.trim()) {
        return "Selecione seu estado.";
      }
      if (!phone.trim()) {
        return "Informe seu WhatsApp ou telefone.";
      }
      return null;
    }

    if (!preferredSubject.trim()) {
      return "Informe o que você quer aprender.";
    }
    if (!preferredLevel.trim()) {
      return "Selecione seu nível.";
    }
    if (!preferredModality) {
      return "Selecione a modalidade.";
    }
    if (
      (preferredModality === "presencial" || preferredModality === "ambos") &&
      !preferredCity.trim()
    ) {
      return "Informe a cidade para aulas presenciais.";
    }
    if (!learningObjective.trim()) {
      return "Selecione seu objetivo de aprendizagem.";
    }
    if (learningObjective === "Outro" && !customObjective.trim()) {
      return "Descreva seu objetivo de aprendizagem.";
    }

    return null;
  }

  function handleNext(event: FormEvent) {
    event.preventDefault();
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!user) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateStudentAccountBasics({
        userId: user.uid,
        displayName,
        photoUrl,
      });

      await saveStudentLearningProfile(user.uid, {
        city,
        state,
        phone,
        preferredSubject,
        preferredLevel,
        preferredModality,
        preferredCity,
        learningObjective:
          learningObjective === "Outro" ? customObjective.trim() : learningObjective,
      });

      setSaved(true);
    } catch (saveError) {
      console.error("student account setup save failed", saveError);
      setError(
        "Não conseguimos salvar suas informações. Verifique os dados e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="rounded-3xl bg-surface p-8 text-center shadow-soft-lg ring-1 ring-border/60">
        <p className="text-lg font-semibold text-foreground">Perfil atualizado!</p>
        <p className="mt-2 text-sm text-muted-foreground">Redirecionando para o painel...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-surface p-8 shadow-soft-lg ring-1 ring-border/60">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary-700">
          {step + 1} de {TOTAL_STEPS}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary-600 transition-all"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={step === TOTAL_STEPS - 1 ? handleSubmit : handleNext} className="space-y-4">
        {step === 0 ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">Informações básicas</h2>

            <label className="block text-sm font-medium text-foreground">
              Nome completo
              <input
                type="text"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>

            {user ? (
              <div>
                <p className="text-sm font-medium text-foreground">Foto (opcional)</p>
                <div className="mt-2">
                  <AvatarUpload
                    userId={user.uid}
                    currentUrl={photoUrl}
                    onUploaded={setPhotoUrl}
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">
                Cidade
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className={`${INPUT_CLASS} mt-1.5`}
                />
              </label>

              <label className="block text-sm font-medium text-foreground">
                Estado
                <select
                  required
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  className={`${SELECT_CLASS} mt-1.5`}
                >
                  {BRAZILIAN_STATES.map((option) => (
                    <option key={option.uf} value={option.uf}>
                      {option.name} ({option.uf})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-foreground">
              WhatsApp / telefone
              <input
                type="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(11) 99999-9999"
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground">Sua aprendizagem</h2>

            <label className="block text-sm font-medium text-foreground">
              O que você quer aprender?
              <input
                type="text"
                required
                value={preferredSubject}
                onChange={(event) => setPreferredSubject(event.target.value)}
                placeholder="Ex: Matemática, Inglês..."
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Nível
              <select
                required
                value={preferredLevel}
                onChange={(event) => setPreferredLevel(event.target.value)}
                className={`${SELECT_CLASS} mt-1.5`}
              >
                <option value="">Selecione</option>
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend className="text-sm font-medium text-foreground">Modalidade</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {MODALITY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`inline-flex cursor-pointer items-center rounded-2xl border px-3 py-2 text-sm ${
                      preferredModality === option.value
                        ? "border-primary-300 bg-primary-50 text-primary-800"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="preferredModality"
                      value={option.value}
                      checked={preferredModality === option.value}
                      onChange={() => setPreferredModality(option.value)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {(preferredModality === "presencial" || preferredModality === "ambos") && (
              <label className="block text-sm font-medium text-foreground">
                Cidade para aulas presenciais
                <input
                  type="text"
                  required
                  value={preferredCity}
                  onChange={(event) => setPreferredCity(event.target.value)}
                  placeholder="Ex: São Paulo"
                  className={`${INPUT_CLASS} mt-1.5`}
                />
              </label>
            )}

            <label className="block text-sm font-medium text-foreground">
              Objetivo de aprendizagem
              <select
                required
                value={learningObjective}
                onChange={(event) => setLearningObjective(event.target.value)}
                className={`${SELECT_CLASS} mt-1.5`}
              >
                <option value="">Selecione</option>
                {LEARNING_OBJECTIVES.map((objective) => (
                  <option key={objective} value={objective}>
                    {objective}
                  </option>
                ))}
              </select>
            </label>

            {learningObjective === "Outro" && (
              <label className="block text-sm font-medium text-foreground">
                Descreva seu objetivo
                <input
                  type="text"
                  required
                  value={customObjective}
                  onChange={(event) => setCustomObjective(event.target.value)}
                  className={`${INPUT_CLASS} mt-1.5`}
                />
              </label>
            )}
          </>
        )}

        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-between gap-3 pt-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep((current) => current - 1);
              }}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium text-foreground"
            >
              Voltar
            </button>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Salvando...
              </>
            ) : step === TOTAL_STEPS - 1 ? (
              "Concluir perfil"
            ) : (
              "Continuar"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
