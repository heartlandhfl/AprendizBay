import type { Tutor } from "@/lib/mock-tutors";
import { getSiteOrigin } from "@/lib/seo/site-url";

export interface TutorPersonJsonLd {
  "@context": "https://schema.org";
  "@type": "Person";
  name: string;
  url: string;
  jobTitle: string;
  knowsAbout: string | string[];
  description?: string;
  image?: string;
  address?: {
    "@type": "PostalAddress";
    addressLocality: string;
    addressRegion: string;
    addressCountry: "BR";
  };
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
    bestRating: 5;
    worstRating: 1;
  };
}

export interface TutorJsonLdInput extends Pick<
  Tutor,
  "id" | "name" | "subject" | "city" | "state" | "rating" | "reviewCount" | "avatarUrl" | "bio"
> {
  headline?: string;
  subjects?: string[];
}

/**
 * schema.org Person + AggregateRating for tutor profiles (Google rich snippets).
 */
export function buildTutorPersonJsonLd(
  tutor: TutorJsonLdInput,
  origin = getSiteOrigin(),
): TutorPersonJsonLd {
  const jsonLd: TutorPersonJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: tutor.name,
    url: `${origin}/tutor/${tutor.id}`,
    jobTitle: `Professor de ${tutor.subject}`,
    knowsAbout:
      tutor.subjects && tutor.subjects.length > 1 ? tutor.subjects : tutor.subject,
  };

  const description = tutor.headline?.trim() || tutor.bio?.trim();
  if (description) {
    jsonLd.description = description;
  }

  if (tutor.avatarUrl) {
    jsonLd.image = tutor.avatarUrl;
  }

  if (tutor.city && tutor.state) {
    jsonLd.address = {
      "@type": "PostalAddress",
      addressLocality: tutor.city,
      addressRegion: tutor.state,
      addressCountry: "BR",
    };
  }

  if (tutor.reviewCount > 0 && Number.isFinite(tutor.rating)) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: tutor.rating,
      reviewCount: tutor.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return jsonLd;
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
