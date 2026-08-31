"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Star } from "lucide-react";
import { db, whenFirebaseReady } from "@/lib/firebase/client";
import { formatReviewCountLabel, formatTutorRating } from "@/lib/tutors/format";
import { hasPublicRating } from "@/lib/tutors/profile-display";

interface TutorRatingStatsProps {
  tutorId: string;
  initialRating: number;
  initialReviewCount: number;
}

export default function TutorRatingStats({
  tutorId,
  initialRating,
  initialReviewCount,
}: TutorRatingStatsProps) {
  const [rating, setRating] = useState(initialRating);
  const [reviewCount, setReviewCount] = useState(initialReviewCount);

  useEffect(() => {
    return whenFirebaseReady(() =>
      onSnapshot(doc(db, "tutors", tutorId), (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const data = snapshot.data();
        const nextRating = data.rating;
        const nextCount = data.reviewCount;

        if (typeof nextRating === "number" && Number.isFinite(nextRating)) {
          setRating(nextRating);
        }

        if (typeof nextCount === "number" && Number.isFinite(nextCount) && nextCount >= 0) {
          setReviewCount(Math.floor(nextCount));
        }
      }),
    );
  }, [tutorId]);

  if (!hasPublicRating({ rating, reviewCount })) {
    return <span className="text-sm text-muted-foreground">Ainda sem avaliações</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Star
        className="h-4 w-4 fill-secondary-400 text-secondary-400"
        aria-hidden="true"
      />
      <span className="font-semibold text-foreground">{formatTutorRating(rating)}</span>
      <span>({formatReviewCountLabel(reviewCount)})</span>
    </span>
  );
}
