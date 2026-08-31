import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Monitor, Users } from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import TutorCard from "@/components/search/TutorCard";
import { INDEX_FOLLOW_ROBOTS, NOINDEX_FOLLOW_ROBOTS } from "@/lib/seo/robots-policy";
import {
  cityPreposition,
  filterTutorsForSubjectCity,
  getIndexableSubjectCityPairs,
  relatedSubjectCityLinks,
  resolveSubjectCity,
  subjectCityEmptyCopy,
  subjectCityHeading,
  subjectCityPath,
  subjectCitySeoCopy,
} from "@/lib/seo/subject-city";
import { buildSubjectCityJsonLd } from "@/lib/seo/tutor-jsonld";
import {
  fetchIndexableTutorsForSeo,
  fetchVerifiedTutorsServer,
} from "@/lib/tutors/server";

interface SubjectCityPageProps {
  params: { materia: string; cidade: string };
}

export const dynamicParams = true;

export async function generateStaticParams() {
  const tutors = await fetchIndexableTutorsForSeo();
  return getIndexableSubjectCityPairs(tutors).map(({ materia, cidade }) => ({
    materia,
    cidade,
  }));
}

export async function generateMetadata({
  params,
}: SubjectCityPageProps): Promise<Metadata> {
  const tutors = await fetchVerifiedTutorsServer();
  const resolved = resolveSubjectCity(tutors, params.materia, params.cidade);

  if (!resolved) {
    return {
      title: "Professores — Aprendiz Bay",
      robots: NOINDEX_FOLLOW_ROBOTS,
    };
  }

  const { local } = filterTutorsForSubjectCity(tutors, resolved.subject, resolved.city);
  const seo = subjectCitySeoCopy(resolved.subject, resolved.city, local.length > 0);

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: subjectCityPath(resolved.subject, resolved.city),
    },
    robots: seo.indexable ? INDEX_FOLLOW_ROBOTS : NOINDEX_FOLLOW_ROBOTS,
  };
}

export default async function SubjectCityPage({ params }: SubjectCityPageProps) {
  const tutors = await fetchVerifiedTutorsServer();
  const resolved = resolveSubjectCity(tutors, params.materia, params.cidade);

  if (!resolved) {
    notFound();
  }

  const { local, online } = filterTutorsForSubjectCity(
    tutors,
    resolved.subject,
    resolved.city,
  );
  const heading = subjectCityHeading(resolved.subject, resolved.city);
  const locationLabel = resolved.state
    ? `${resolved.city}, ${resolved.state}`
    : resolved.city;
  const empty = subjectCityEmptyCopy(resolved.subject, resolved.city);
  const { cities: relatedCities, subjects: relatedSubjects } = relatedSubjectCityLinks(
    tutors,
    resolved,
    params,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd
        data={buildSubjectCityJsonLd({
          subject: resolved.subject,
          city: resolved.city,
          localTutors: local,
        })}
      />
      <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="transition-colors hover:text-primary-600">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/professores" className="transition-colors hover:text-primary-600">
              Professores
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <span className="text-foreground">{resolved.subject}</span>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <span className="text-foreground">{resolved.city}</span>
          </li>
        </ol>
      </nav>

      <Link
        href="/professores"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Todas as matérias e cidades
      </Link>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{heading}</h1>
        {local.length > 0 ? (
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Encontre professores de {resolved.subject.toLowerCase()} {cityPreposition(resolved.city)}{" "}
            {resolved.city} para aulas particulares ou em grupo. Compare avaliações, preços e
            modalidade — e economize com{" "}
            <span className="inline-flex items-center gap-1 font-medium text-secondary-600">
              <Users className="h-4 w-4" aria-hidden="true" />
              aulas coletivas
            </span>
            .
          </p>
        ) : (
          <p className="mt-3 max-w-3xl text-muted-foreground">{empty.description}</p>
        )}
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {locationLabel}
        </p>
      </header>

      {local.length > 0 ? (
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {local.length} professor{local.length !== 1 ? "es" : ""} em {resolved.city}
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {local.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        </section>
      ) : (
        <div className="mb-12 rounded-2xl bg-muted/60 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-foreground">{empty.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">{empty.description}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/search?subject=${encodeURIComponent(resolved.subject)}`}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
            >
              Buscar {resolved.subject.toLowerCase()} online
            </Link>
            <Link
              href="/professores"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Ver outras cidades
            </Link>
          </div>
        </div>
      )}

      {online.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-5 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <Monitor className="h-5 w-5 text-primary-600" aria-hidden="true" />
            Também disponíveis online
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Professores de {resolved.subject.toLowerCase()} que dão aula online — não estão em{" "}
            {resolved.city}.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {online.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        </section>
      )}

      {(relatedCities.length > 0 || relatedSubjects.length > 0) && (
        <aside className="rounded-2xl bg-surface p-6 shadow-card ring-1 ring-border/50">
          {relatedCities.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Professores de {resolved.subject} em outras cidades
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {relatedCities.map((pair) => (
                  <li key={`${pair.materia}-${pair.cidade}`}>
                    <Link
                      href={subjectCityPath(pair.subject, pair.city)}
                      className="inline-flex rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
                    >
                      {pair.city}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {relatedSubjects.length > 0 && (
            <div className={relatedCities.length > 0 ? "mt-6" : undefined}>
              <h2 className="text-sm font-semibold text-foreground">
                Outras matérias {cityPreposition(resolved.city)} {resolved.city}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {relatedSubjects.map((pair) => (
                  <li key={`${pair.materia}-${pair.cidade}`}>
                    <Link
                      href={subjectCityPath(pair.subject, pair.city)}
                      className="inline-flex rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
                    >
                      {pair.subject}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
