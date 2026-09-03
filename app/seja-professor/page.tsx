import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Calendar,
  GraduationCap,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Seja um Professor — Aprendiz Bay",
  description:
    "Cadastre-se como professor na Aprendiz Bay, defina seus preços e receba alunos para aulas individuais ou em grupo — online ou presencial.",
  alternates: {
    canonical: "/seja-professor",
  },
};

const benefits = [
  {
    icon: Users,
    title: "Alcance mais alunos",
    description:
      "Apareça na busca da plataforma e receba pedidos de aula de quem já procura sua matéria.",
  },
  {
    icon: Wallet,
    title: "Você define o preço",
    description:
      "Escolha valores para aulas individuais e coletivas, com total controle sobre sua agenda.",
  },
  {
    icon: Calendar,
    title: "Online ou presencial",
    description:
      "Atenda de qualquer lugar do Brasil ou marque aulas presenciais na sua cidade.",
  },
  {
    icon: BadgeCheck,
    title: "Perfil verificado",
    description:
      "Depois da aprovação da equipe, seu perfil ganha destaque e mais confiança dos alunos.",
  },
];

const steps = [
  {
    number: "01",
    title: "Crie sua conta de professor",
    description: "Cadastre-se em poucos minutos com e-mail ou Google.",
  },
  {
    number: "02",
    title: "Complete seu perfil",
    description:
      "Informe matérias, preços, disponibilidade e envie documentos para verificação.",
  },
  {
    number: "03",
    title: "Comece a receber alunos",
    description:
      "Após a aprovação, você aparece na busca e pode confirmar aulas na plataforma.",
  },
];

export default function SejaProfessorPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/60 via-background to-background"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-secondary-200/30 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200/60 bg-surface/80 px-4 py-1.5 text-sm font-medium text-primary-700 shadow-card backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-secondary-500" aria-hidden="true" />
              Para quem quer ensinar
            </div>

            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Ensine na{" "}
              <span className="bg-gradient-to-r from-primary-600 to-accent bg-clip-text text-transparent">
                Aprendiz Bay
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
              Conecte-se a alunos que buscam aulas acessíveis, monte seu perfil de
              professor e comece a receber pedidos individuais ou em grupo.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup?role=tutor"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary-600 px-6 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
              >
                Criar conta de professor
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-surface px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Por que ensinar conosco?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Uma plataforma pensada para tutores brasileiros que querem crescer com
              flexibilidade.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-2xl bg-surface p-6 shadow-card ring-1 ring-border/50"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
                  <benefit.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Como começar
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Três passos para publicar seu perfil e receber alunos.
            </p>
          </div>

          <ol className="mx-auto mt-12 grid max-w-4xl gap-6">
            {steps.map((step) => (
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
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
            <GraduationCap className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Pronto para começar?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Crie sua conta de professor agora e complete o cadastro em poucos minutos.
          </p>
          <Link
            href="/signup?role=tutor"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl bg-primary-600 px-6 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
          >
            Quero ensinar na Aprendiz Bay
          </Link>
        </div>
      </section>
    </>
  );
}
