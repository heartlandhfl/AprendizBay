import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import TutorCatalogProblem from "@/components/catalog/TutorCatalogProblem";
import {
  cityPreposition,
  getIndexableSubjectCityPairs,
  subjectCityPath,
} from "@/lib/seo/subject-city";
import { isCatalogProblem, tutorsForPublicPages } from "@/lib/tutors/catalog";
import { fetchVerifiedTutorsServer } from "@/lib/tutors/server";

export const metadata: Metadata = {
  title: "Professores por matéria e cidade — Aprendiz Bay",
  description:
    "Encontre professores particulares e aulas em grupo por matéria e cidade no Brasil. Compare preços e economize com aulas coletivas.",
  alternates: {
    canonical: "/professores",
  },
};

export default async function ProfessoresIndexPage() {
  const catalog = await fetchVerifiedTutorsServer();

  if (isCatalogProblem(catalog.state)) {
    return <TutorCatalogProblem kind={catalog.state} />;
  }

  const tutors = tutorsForPublicPages(catalog);
  const pairs = getIndexableSubjectCityPairs(tutors);

  const bySubject = new Map<string, typeof pairs>();
  for (const pair of pairs) {
    const list = bySubject.get(pair.subject) ?? [];
    list.push(pair);
    bySubject.set(pair.subject, list);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Professores por matéria e cidade
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Só listamos combinações com professores verificados naquela cidade —
          do jeito que os alunos pesquisam, sem páginas vazias inventadas.
        </p>
      </header>

      {pairs.length === 0 ? (
        <div className="rounded-2xl bg-muted/60 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-foreground">
            Ainda não há professores verificados por matéria e cidade
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Quando professores forem aprovados, as páginas de matéria e cidade
            aparecem aqui. Enquanto isso, você pode buscar aulas ou voltar ao
            início.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/search"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
            >
              Buscar professores
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Ir para o início
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {[...bySubject.entries()].map(([subject, subjectPairs]) => (
            <section key={subject}>
              <h2 className="text-lg font-semibold text-foreground">
                Professores de {subject}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {subjectPairs.map((pair) => (
                  <li key={`${pair.materia}-${pair.cidade}`}>
                    <Link
                      href={subjectCityPath(pair.subject, pair.city)}
                      className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-sm font-medium text-primary-700 shadow-card ring-1 ring-border/50 transition-all hover:-translate-y-0.5 hover:shadow-soft hover:ring-primary-200"
                    >
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {subject} {cityPreposition(pair.city)} {pair.city}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
