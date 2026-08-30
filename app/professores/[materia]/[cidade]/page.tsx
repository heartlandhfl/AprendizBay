import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Monitor, Users } from "lucide-react";
import TutorCard from "@/components/search/TutorCard";
import {
  cityPreposition,
  filterTutorsForSubjectCity,
  getPopularSubjectCityPairs,
  resolveSubjectCity,
  subjectCityHeading,
  subjectCityPath,
} from "@/lib/seo/subject-city";
import { fetchVerifiedTutorsServer } from "@/lib/tutors/server";

interface SubjectCityPageProps {
  params: { materia: string; cidade: string };
}

export async function generateStaticParams() {
  const tutors = await fetchVerifiedTutorsServer();
  return getPopularSubjectCityPairs(tutors).map(({ materia, cidade }) => ({
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
    return { title: "Professores — Aprendiz Bay" };
  }

  const heading = subjectCityHeading(resolved.subject, resolved.city);

  return {
    title: `${heading} | Aprendiz Bay`,
    description: `Encontre professores de ${resolved.subject.toLowerCase()} ${cityPreposition(resolved.city)} ${resolved.city} para aulas particulares ou em grupo. Compare preços e economize com aulas coletivas.`,
    alternates: {
      canonical: subjectCityPath(resolved.subject, resolved.city),
    },
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

  const relatedCities = getPopularSubjectCityPairs(tutors)
    .filter(
      (pair) =>
        pair.subject === resolved.subject && pair.cidade !== params.cidade,
    )
    .slice(0, 6);

  const relatedSubjects = getPopularSubjectCityPairs(tutors)
    .filter(
      (pair) => pair.city === resolved.city && pair.materia !== params.materia,
    )
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
          <p className="text-lg font-semibold text-foreground">
            Ainda não temos professores de {resolved.subject.toLowerCase()} em {resolved.city}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Veja quem ensina essa matéria online ou explore outras cidades.
          </p>
        </div>
      )}

      {online.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-5 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <Monitor className="h-5 w-5 text-primary-600" aria-hidden="true" />
            Também disponíveis online
          </h2>
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
