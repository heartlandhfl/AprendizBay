"use client";

import { FormEvent, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/constants";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Não foi possível enviar sua mensagem.");
        return;
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setError("Não foi possível enviar sua mensagem. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl bg-surface p-6 shadow-soft ring-1 ring-border/60 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">
            Nome
          </label>
          <input
            id="contact-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="Seu nome"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium">
            E-mail
          </label>
          <input
            id="contact-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">
            Mensagem
          </label>
          <textarea
            id="contact-message"
            required
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="Como podemos ajudar?"
          />
        </div>

        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}{" "}
            <a
              href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
              className="font-medium underline hover:text-red-800"
            >
              Escreva para {SUPPORT_CONTACT_EMAIL}
            </a>
          </p>
        ) : null}

        {success ? (
          <p className="rounded-2xl bg-primary-50 px-4 py-3 text-sm text-primary-800" role="status">
            Mensagem enviada com sucesso. Responderemos em breve.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              Enviar
            </>
          )}
        </button>
      </form>
    </div>
  );
}
