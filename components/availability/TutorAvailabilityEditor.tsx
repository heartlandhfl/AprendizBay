"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/lib/availability/constants";
import {
  formatAvailabilitySummary,
  saveTutorAvailability,
  subscribeToTutorAvailability,
} from "@/lib/availability/service";
import type { AvailabilitySlot, Weekday } from "@/lib/availability/types";

interface EditableSlot {
  key: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
}

const DEFAULT_SLOT: Omit<EditableSlot, "key" | "weekday"> = {
  startTime: "09:00",
  endTime: "10:00",
};

function createEditableSlot(weekday: Weekday, slot?: AvailabilitySlot): EditableSlot {
  return {
    key: `${weekday}-${slot?.startTime ?? DEFAULT_SLOT.startTime}-${slot?.endTime ?? DEFAULT_SLOT.endTime}-${Math.random().toString(36).slice(2, 8)}`,
    weekday,
    startTime: slot?.startTime ?? DEFAULT_SLOT.startTime,
    endTime: slot?.endTime ?? DEFAULT_SLOT.endTime,
  };
}

function toAvailabilitySlots(editableSlots: EditableSlot[]): AvailabilitySlot[] {
  return editableSlots.map(({ weekday, startTime, endTime }) => ({
    weekday,
    startTime,
    endTime,
  }));
}

export default function TutorAvailabilityEditor() {
  const { user } = useAuth();
  const [editableSlots, setEditableSlots] = useState<EditableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToTutorAvailability(
      user.uid,
      (availability) => {
        setEditableSlots(
          availability.slots.length > 0
            ? availability.slots.map((slot) => createEditableSlot(slot.weekday, slot))
            : [],
        );
        setLoading(false);
        setDirty(false);
      },
      () => {
        setError("Não foi possível carregar sua disponibilidade.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  const summary = useMemo(
    () => formatAvailabilitySummary(toAvailabilitySlots(editableSlots)),
    [editableSlots],
  );

  function updateSlot(key: string, patch: Partial<Pick<EditableSlot, "startTime" | "endTime">>) {
    setEditableSlots((current) =>
      current.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)),
    );
    setDirty(true);
    setSuccess(null);
    setError(null);
  }

  function addSlot(weekday: Weekday) {
    setEditableSlots((current) => [...current, createEditableSlot(weekday)]);
    setDirty(true);
    setSuccess(null);
    setError(null);
  }

  function removeSlot(key: string) {
    setEditableSlots((current) => current.filter((slot) => slot.key !== key));
    setDirty(true);
    setSuccess(null);
    setError(null);
  }

  async function handleSave() {
    if (!user) {
      setError("Faça login como professor para salvar sua disponibilidade.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await saveTutorAvailability(user.uid, toAvailabilitySlots(editableSlots));
      setSuccess("Disponibilidade salva com sucesso!");
      setDirty(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar sua disponibilidade.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Carregando disponibilidade...
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Disponibilidade semanal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe os dias e horários em que você pode dar aulas individuais.
          </p>
        </div>
        <p className="rounded-2xl bg-muted/50 px-4 py-2 text-xs text-muted-foreground sm:max-w-sm">
          {summary}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {WEEKDAYS.map((weekday) => {
          const daySlots = editableSlots.filter((slot) => slot.weekday === weekday);

          return (
            <article
              key={weekday}
              className="rounded-2xl border border-border bg-muted/20 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-foreground">{WEEKDAY_LABELS[weekday]}</h3>
                <button
                  type="button"
                  onClick={() => addSlot(weekday)}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                >
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Adicionar horário
                </button>
              </div>

              {daySlots.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Sem horários neste dia.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {daySlots.map((slot) => (
                    <li
                      key={slot.key}
                      className="flex flex-col gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border/50 sm:flex-row sm:items-end"
                    >
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`start-${slot.key}`}
                            className="mb-1.5 block text-xs font-medium text-muted-foreground"
                          >
                            Início
                          </label>
                          <input
                            id={`start-${slot.key}`}
                            type="time"
                            required
                            value={slot.startTime}
                            onChange={(event) =>
                              updateSlot(slot.key, { startTime: event.target.value })
                            }
                            className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`end-${slot.key}`}
                            className="mb-1.5 block text-xs font-medium text-muted-foreground"
                          >
                            Término
                          </label>
                          <input
                            id={`end-${slot.key}`}
                            type="time"
                            required
                            value={slot.endTime}
                            onChange={(event) =>
                              updateSlot(slot.key, { endTime: event.target.value })
                            }
                            className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSlot(slot.key)}
                        className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                        aria-label={`Remover horário de ${WEEKDAY_LABELS[weekday]}`}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p
          className="mt-4 rounded-2xl bg-primary-50 px-4 py-3 text-sm text-primary-800"
          role="status"
        >
          {success}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Salvando...
            </>
          ) : (
            "Salvar disponibilidade"
          )}
        </button>

        {!dirty && editableSlots.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Adicione horários para que os alunos saibam quando você está disponível.
          </p>
        )}
      </div>
    </section>
  );
}
