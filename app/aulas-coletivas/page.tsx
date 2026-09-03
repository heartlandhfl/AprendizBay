import type { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  GraduationCap,
  LogIn,
  Search,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Aulas Coletivas — Aprendiz Bay",
  description:
    "Crie turmas coletivas como professor ou entre em aulas em grupo como aluno. Publique vagas, defina preços e comece a ensinar na Aprendiz Bay.",
  alternates: {
    canonical: "/aulas-coletivas",
  },
};

const tutorSteps = [
  {
    number: "01",
    title: "Cadastre-se como professor",
    description:
      "Crie sua conta de professor com e-mail ou Google e complete o perfil com matérias, preços e disponibilidade.",
  },
  {
    number: "02",
    title: "Aguarde a verificação",
    description:
      "Depois de enviar seus dados, a equipe analisa o perfil. Turmas coletivas públicas só podem ser criadas por professores verificados.",
  },
  {
    number: "03",
    title: "Crie a turma coletiva",
    description:
      "No painel do professor, informe tema, disciplina, data, horário, vagas, modalidade e preço por aluno. A turma aparece na busca da plataforma.",
  },
  {
    number: "04",
    title: "Receba alunos e confirme a aula",
    description:
      "Os alunos entram na turma, pagam pela plataforma e você acompanha as vagas preenchidas. No horário marcado, inicie a sala online ou encontre o grupo presencialmente.",
  },
];

const studentSteps = [
  {
    number: "01",
    title: "Busque turmas abertas",
    description:
      "Use a busca da plataforma e filtre por aula coletiva para ver turmas com vagas, preço por pessoa e horário.",
  },
  {
    number: "02",
    title: "Entre na turma",
    description:
      "Faça login como aluno, reserve sua vaga e pague com segurança pelo checkout da plataforma.",
  },
  {
    number: "03",
    title: "Participe da aula",
    description:
      "No dia e horário combinados, acesse a sala online pelo link da reserva ou compareça ao encontro presencial.",
  },
];

export default function AulasColetivasPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/60 via-background to-background"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200/60 bg-surface/80 px-4 py-1.5 text-sm font-medium text-primary-700 shadow-card backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-secondary-500" aria-hidden="true" />
              Aulas em grupo com preço compartilhado
            </div>

            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Aulas{" "}
              <span className="bg-gradient-to-r from-primary-600 to-accent bg-clip-text text-transparent">
                Coletivas
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
              Professores publicam turmas com vagas limitadas. Alunos entram, dividem o custo e
              aprendem juntos, online ou presencial.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/tutor/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary-600 px-6 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
              >
                Criar turma coletiva
              </Link>
              <Link
                href="/search"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-surface px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Buscar turmas abertas
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Como iniciar uma aula coletiva
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Se você é professor, siga estes passos para publicar sua turma e receber alunos.
            </p>
          </div>

          <ol className="mx-auto mt-12 grid max-w-4xl gap-6">
            {tutorSteps.map((step) => (
              <li
                key={step.number}
                className="flex gap-5 rounded-2xl bg-surface p-6 shadow-card ring-1 ring-border/50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-sm font-bold text-white">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-10 flex max-w-4xl flex-col gap-3 sm:flex-row">
            <Link
              href="/seja-professor"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Ainda não sou professor
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Entrar na minha conta
            </Link>
            <Link
              href="/tutor/dashboard"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Abrir painel do professor
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Para alunos
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Quer entrar em uma turma? Encontre aulas coletivas abertas, reserve sua vaga e
                pague com segurança na plataforma.
              </p>

              <ol className="mt-8 space-y-5">
                {studentSteps.map((step) => (
                  <li key={step.number} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100 text-sm font-bold text-secondary-700">
                      {step.number}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <Link
                href="/search"
                className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Buscar aulas coletivas
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                {
                  icon: Users,
                  title: "Vagas limitadas",
                  description: "Cada turma tem um número máximo de alunos definido pelo professor.",
                },
                {
                  icon: Calendar,
                  title: "Data e horário claros",
                  description: "Você vê quando a aula acontece antes de confirmar a reserva.",
                },
                {
                  icon: Video,
                  title: "Online ou presencial",
                  description: "A modalidade é informada no anúncio da turma.",
                },
                {
                  icon: GraduationCap,
                  title: "Pagamento na plataforma",
                  description: "Reserve e pague com segurança sem combinar valores por fora.",
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
