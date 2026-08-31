import type { Tutor } from "@/lib/mock-tutors";
import { getSiteOrigin } from "@/lib/seo/site-url";
import { subjectCityHeading, subjectCityPath } from "@/lib/seo/subject-city";

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

export function hasGenuineAggregateRating(tutor: {
  rating?: unknown;
  reviewCount?: unknown;
}): boolean {
  return (
    typeof tutor.reviewCount === "number" &&
    Number.isInteger(tutor.reviewCount) &&
    tutor.reviewCount > 0 &&
    typeof tutor.rating === "number" &&
    Number.isFinite(tutor.rating) &&
    tutor.rating >= 1 &&
    tutor.rating <= 5
  );
}

/**
 * schema.org Person for a real tutor profile. Returns null when the record is
 * incomplete so pages never emit structured data for fictional people.
 * AggregateRating is included only when a genuine review count exists.
 */
export function buildTutorPersonJsonLd(
  tutor: TutorJsonLdInput,
  origin = getSiteOrigin(),
): TutorPersonJsonLd | null {
  const id = tutor.id?.trim();
  const name = tutor.name?.trim();
  const subject = tutor.subject?.trim();

  if (!id || !name || !subject) {
    return null;
  }

  const jsonLd: TutorPersonJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: `${origin}/tutor/${id}`,
    jobTitle: `Professor de ${subject}`,
    knowsAbout:
      tutor.subjects && tutor.subjects.length > 1 ? tutor.subjects : subject,
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

  if (hasGenuineAggregateRating(tutor)) {
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

export function buildSubjectCityJsonLd(input: {
  subject: string;
  city: string;
  localTutors: Array<Pick<Tutor, "id" | "name">>;
  origin?: string;
}): Record<string, unknown> {
  const origin = input.origin ?? getSiteOrigin();
  const heading = subjectCityHeading(input.subject, input.city);
  const pageUrl = `${origin}${subjectCityPath(input.subject, input.city)}`;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Início",
          item: origin,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Professores",
          item: `${origin}/professores`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: heading,
          item: pageUrl,
        },
      ],
    },
  ];

  if (input.localTutors.length > 0) {
    graph.push({
      "@type": "ItemList",
      name: heading,
      url: pageUrl,
      numberOfItems: input.localTutors.length,
      itemListElement: input.localTutors.map((tutor, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}/tutor/${tutor.id}`,
        name: tutor.name,
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function buildWebsiteJsonLd(origin = getSiteOrigin()): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Aprendiz Bay",
    url: origin,
    inLanguage: "pt-BR",
    description:
      "Plataforma brasileira de tutoria e aprendizado coletivo. Encontre professores particulares e participe de aulas em grupo.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
