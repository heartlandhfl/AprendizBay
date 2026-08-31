"use client";

import { FormEvent, useState } from "react";
import { Loader2, Star, X } from "lucide-react";
import { createReview } from "@/lib/reviews/client";

interface ReviewModalProps {
  bookingId: string;
  tutorId: string;
  tutorName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ReviewModal({
  bookingId,
  tutorId,
  tutorName,
  onClose,
  onSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await createReview({
        tutorId,
        bookingId,
        rating,
        comment,
      });

      onSubmitted();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível enviar a avaliação. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const displayRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-soft-lg ring-1 ring-border/60">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="review-modal-title" className="text-xl font-bold text-foreground">
              Avaliar aula
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Como foi sua aula com {tutorName}?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">Nota</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="rounded-lg p-1 transition-transform hover:scale-110"
                  aria-label={`${value} estrela${value !== 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-8 w-8 ${
                      value <= displayRating
                        ? "fill-secondary-400 text-secondary-400"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="review-comment" className="mb-1.5 block text-sm font-medium">
              Comentário
            </label>
            <textarea
              id="review-comment"
              required
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="Conte como foi a experiência..."
            />
          </div>

          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-primary-600 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              "Enviar avaliação"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
