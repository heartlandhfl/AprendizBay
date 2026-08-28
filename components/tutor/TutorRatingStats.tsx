"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Star } from "lucide-react";
import { db } from "@/lib/firebase/client";

interface TutorRatingStatsProps {
  tutorId: string;
  initialRating: number;
  initialReviewCount: number;
}

function formatRating(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export default function TutorRatingStats({
  tutorId,
  initialRating,
  initialReviewCount,
}: TutorRatingStatsProps) {
  const [rating, setRating] = useState(initialRating);
  const [reviewCount, setReviewCount] = useState(initialReviewCount);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "tutors", tutorId), (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const data = snapshot.data();
      setRating((data.rating as number) ?? initialRating);
      setReviewCount((data.reviewCount as number) ?? initialReviewCount);
    });

    return unsubscribe;
  }, [initialRating, initialReviewCount, tutorId]);

  return (
    <span className="inline-flex items-center gap-1">
      <Star
        className="h-4 w-4 fill-secondary-400 text-secondary-400"
        aria-hidden="true"
      />
      <span className="font-semibold text-foreground">{formatRating(rating)}</span>
      ({reviewCount} avaliação{reviewCount !== 1 ? "ões" : ""})
    </span>
  );
}
