"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createCollectiveHub } from "@/lib/hubs/service";

export default function CreateHubForm() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState(6);
  const [currentPrice, setCurrentPrice] = useState(25);
  const [fullPrice, setFullPrice] = useState(18);
  const [schedule, setSchedule] = useState("");
  const [modality, setModality] = useState<"online" | "presencial">("online");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("Faça login como professor para criar turmas.");
      return;
    }

    if (maxStudents < 2 || maxStudents > 20) {
      setError("A turma deve ter entre 2 e 20 alunos.");
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
        schedule,
        modality,
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
      <h2 className="text-xl font-bold text-foreground">Criar turma</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Abra uma turma coletiva para seus alunos se inscreverem.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="hub-title" className="mb-1.5 block text-sm font-medium">
            Título
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

          <div>
            <label htmlFor="hub-schedule" className="mb-1.5 block text-sm font-medium">
              Horário
            </label>
            <input
              id="hub-schedule"
              type="text"
              required
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
              className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="Terças, 19h · Online"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="hub-current-price" className="mb-1.5 block text-sm font-medium">
              Preço atual (R$/h)
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
          disabled={submitting}
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
