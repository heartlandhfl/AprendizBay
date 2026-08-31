"use client";

import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { subscribeToTutorReviews } from "@/lib/reviews/client";
import type { PublicTutorReview } from "@/lib/reviews/types";
import { formatReviewCountLabel, formatTutorRating } from "@/lib/tutors/format";
import { hasPublicRating } from "@/lib/tutors/profile-display";

interface TutorReviewsProps {
  tutorId: string;
  initialRating: number;
  initialReviewCount: number;
}

function formatReviewDate(date: Date | null): string | undefined {
  if (!date) {
    return undefined;
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function TutorReviews({
  tutorId,
  initialRating,
  initialReviewCount,
}: TutorReviewsProps) {
  const [reviews, setReviews] = useState<PublicTutorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    return subscribeToTutorReviews(
      tutorId,
      (nextReviews) => {
        setReviews(nextReviews);
        setLoading(false);
      },
      () => {
        setError("Não foi possível carregar as avaliações.");
        setLoading(false);
      },
    );
  }, [tutorId]);

  const reviewCount = loading ? initialReviewCount : reviews.length;
  const rating =
    !loading && reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : initialRating;
  const showSummary = hasPublicRating({ rating, reviewCount });

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">Avaliações</h2>
        {showSummary ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star
              className="h-4 w-4 fill-secondary-400 text-secondary-400"
              aria-hidden="true"
            />
            <span className="font-semibold text-foreground">{formatTutorRating(rating)}</span>
            <span>({formatReviewCountLabel(reviewCount)})</span>
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" aria-hidden="true" />
          Carregando avaliações...
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && reviews.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          Este professor ainda não recebeu avaliações.
        </p>
      ) : null}

      {!loading && !error && reviews.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {reviews.map((review) => {
            const dateLabel = formatReviewDate(review.createdAt);

            return (
              <li
                key={review.id}
                className="rounded-2xl border border-border/70 bg-muted/30 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                    <Star
                      className="h-4 w-4 fill-secondary-400 text-secondary-400"
                      aria-hidden="true"
                    />
                    {formatTutorRating(review.rating)}
                    <span className="sr-only">de 5</span>
                  </p>
                  {dateLabel ? (
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={review.createdAt?.toISOString()}
                    >
                      {dateLabel}
                    </time>
                  ) : null}
                </div>
                {review.comment ? (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {review.comment}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
