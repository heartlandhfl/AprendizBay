"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Modality } from "@/lib/mock-tutors";
import { EDUCATION_LEVELS } from "@/lib/tutors/search";
import type { StudentLearningProfile } from "@/lib/student-dashboard/types";
import { saveStudentLearningProfile } from "@/lib/student-dashboard/preferences";

interface StudentLearningProfileModalProps {
  studentId: string;
  initialProfile: StudentLearningProfile;
  onClose: () => void;
  onSaved: (profile: StudentLearningProfile) => void;
}

const MODALITY_OPTIONS: Array<{ value: Modality; label: string }> = [
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial" },
  { value: "ambos", label: "Online e presencial" },
];

export default function StudentLearningProfileModal({
  studentId,
  initialProfile,
  onClose,
  onSaved,
}: StudentLearningProfileModalProps) {
  const [profile, setProfile] = useState<StudentLearningProfile>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await saveStudentLearningProfile(studentId, profile);
      onSaved(profile);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar suas preferências.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-soft-lg ring-1 ring-border/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="learning-profile-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="learning-profile-title" className="text-lg font-bold text-foreground">
              Suas preferências de aprendizagem
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajude a plataforma a sugerir professores mais compatíveis com você.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-foreground">
            Matéria de interesse
            <input
              type="text"
              value={profile.preferredSubject ?? ""}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  preferredSubject: event.target.value,
                }))
              }
              placeholder="Ex: Matemática, Inglês..."
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-foreground">
            Nível
            <select
              value={profile.preferredLevel ?? ""}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  preferredLevel: event.target.value,
                }))
              }
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm"
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
                    profile.preferredModality === option.value
                      ? "border-primary-300 bg-primary-50 text-primary-800"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="preferredModality"
                    value={option.value}
                    checked={profile.preferredModality === option.value}
                    onChange={() =>
                      setProfile((current) => ({
                        ...current,
                        preferredModality: option.value,
                      }))
                    }
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {(profile.preferredModality === "presencial" ||
            profile.preferredModality === "ambos") && (
            <label className="block text-sm font-medium text-foreground">
              Cidade
              <input
                type="text"
                value={profile.preferredCity ?? ""}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    preferredCity: event.target.value,
                  }))
                }
                placeholder="Ex: São Paulo"
                className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm"
              />
            </label>
          )}

          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-4 text-sm font-medium text-foreground"
            >
              Agora não
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar preferências"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
