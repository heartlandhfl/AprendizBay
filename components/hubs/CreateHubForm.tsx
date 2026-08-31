"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { buildHubSchedule } from "@/lib/hubs/public";
import { createCollectiveHub } from "@/lib/hubs/service";
import { SUBJECTS } from "@/lib/mock-tutors";
import { useTutorProfile } from "@/lib/tutors/useTutorProfile";
import { isMarketplaceVisible } from "@/lib/tutors/verification";

const SUBJECT_OPTIONS = SUBJECTS.filter((subject) => subject !== "Todas as matérias");

function tomorrowIsoDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CreateHubForm() {
  const { user } = useAuth();
  const { tutorDoc, loading: profileLoading } = useTutorProfile();
  const eligible = isMarketplaceVisible(tutorDoc);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [scheduledDate, setScheduledDate] = useState(tomorrowIsoDate);
  const [startTime, setStartTime] = useState("19:00");
  const [maxStudents, setMaxStudents] = useState(6);
  const [currentPrice, setCurrentPrice] = useState(25);
  const [fullPrice, setFullPrice] = useState(18);
  const [schedule, setSchedule] = useState("");
  const [modality, setModality] = useState<"online" | "presencial">("online");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tutorDoc?.subject && !subject) {
      setSubject(tutorDoc.subject);
    }
    if (typeof tutorDoc?.collectivePrice === "number") {
      setCurrentPrice(tutorDoc.collectivePrice);
    }
    if (typeof tutorDoc?.individualPrice === "number") {
      setFullPrice(Math.max(1, Math.round(tutorDoc.collectivePrice * 0.7)));
    }
  }, [subject, tutorDoc]);

  const derivedSchedule = useMemo(
    () => buildHubSchedule({ scheduledDate, startTime, modality }),
    [modality, scheduledDate, startTime],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("Faça login como professor para criar turmas.");
      return;
    }

    if (!eligible) {
      setError(
        "Só professores verificados podem oferecer turmas coletivas públicas. Aguarde a aprovação do seu perfil.",
      );
      return;
    }

    if (maxStudents < 2 || maxStudents > 20) {
      setError("A turma deve ter entre 2 e 20 alunos.");
      return;
    }

    if (!subject.trim()) {
      setError("Informe a disciplina da turma.");
      return;
    }

    setSubmitting(true);

    try {
      await createCollectiveHub(user.uid, {
        title,
        description,
        maxStudents,
        currentPrice,
        fullPrice,
        schedule: schedule.trim() || derivedSchedule,
        modality,
        subject: subject.trim(),
        scheduledDate,
        startTime,
        tutorName: tutorDoc?.name || user.displayName || "Professor",
        individualPrice: tutorDoc?.individualPrice || currentPrice,
      });

      setSuccess("Turma criada com sucesso!");
      setTitle("");
      setDescription("");
      setSchedule("");
    } catch {
      setError("Não foi possível criar a turma.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60">
      <h2 className="text-xl font-bold text-foreground">Criar turma coletiva</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Publique uma aula coletiva na busca. Os alunos veem disciplina, horário, vagas e o
        preço por pessoa.
      </p>

      {!profileLoading && !eligible && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          Seu perfil ainda não está aprovado. Turmas coletivas públicas só podem ser criadas
          por professores verificados.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="hub-title" className="mb-1.5 block text-sm font-medium">
            Tema / título
          </label>
          <input
            id="hub-title"
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="Ex: Inglês para Viagem"
          />
        </div>

        <div>
          <label htmlFor="hub-description" className="mb-1.5 block text-sm font-medium">
            Descrição
          </label>
          <textarea
            id="hub-description"
            required
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="Descreva o conteúdo e objetivo da turma"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="hub-subject" className="mb-1.5 block text-sm font-medium">
              Disciplina
            </label>
            <select
              id="hub-subject"
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Selecione</option>
              {SUBJECT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="hub-max-students" className="mb-1.5 block text-sm font-medium">
              Máximo de alunos
            </label>
            <input
              id="hub-max-students"
              type="number"
              min={2}
              max={20}
              required
              value={maxStudents}
              onChange={(event) => setMaxStudents(Number(event.target.value))}
              className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="hub-date" className="mb-1.5 block text-sm font-medium">
              Data
            </label>
            <input
              id="hub-date"
              type="date"
              required
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
              className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div>
            <label htmlFor="hub-time" className="mb-1.5 block text-sm font-medium">
              Horário
            </label>
            <input
              id="hub-time"
              type="time"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
        </div>

        <div>
          <label htmlFor="hub-schedule" className="mb-1.5 block text-sm font-medium">
            Resumo do horário (opcional)
          </label>
          <input
            id="hub-schedule"
            type="text"
            value={schedule}
            onChange={(event) => setSchedule(event.target.value)}
            className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder={derivedSchedule}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="hub-current-price" className="mb-1.5 block text-sm font-medium">
              Preço por aluno (R$/h)
            </label>
            <input
              id="hub-current-price"
              type="number"
              min={1}
              required
              value={currentPrice}
              onChange={(event) => setCurrentPrice(Number(event.target.value))}
              className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div>
            <label htmlFor="hub-full-price" className="mb-1.5 block text-sm font-medium">
              Preço com turma cheia (R$/h)
            </label>
            <input
              id="hub-full-price"
              type="number"
              min={1}
              required
              value={fullPrice}
              onChange={(event) => setFullPrice(Number(event.target.value))}
              className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium">Modalidade</span>
          <div className="flex gap-2">
            {(
              [
                { value: "online", label: "Online" },
                { value: "presencial", label: "Presencial" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setModality(option.value)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  modality === option.value
                    ? "bg-primary-600 text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={modality === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-2xl bg-primary-50 px-4 py-3 text-sm text-primary-800" role="status">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !eligible}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Criando...
            </>
          ) : (
            "Criar turma"
          )}
        </button>
      </form>
    </section>
  );
}
