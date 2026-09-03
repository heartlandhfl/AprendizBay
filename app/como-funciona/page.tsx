import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  CreditCard,
  LogIn,
  MessageCircle,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Como Funciona — Aprendiz Bay",
  description:
    "Saiba como a Aprendiz Bay funciona para alunos: crie sua conta, encontre professores, reserve aulas individuais ou coletivas e acompanhe tudo na plataforma.",
  alternates: {
    canonical: "/como-funciona",
  },
};

const studentJourney = [
  {
    icon: UserPlus,
    title: "Crie sua conta de aluno",
    description:
      "Cadastre-se com e-mail e senha ou com sua conta Google. Escolha o perfil de aluno para reservar aulas e conversar com professores.",
  },
  {
    icon: Search,
    title: "Encontre o professor ideal",
    description:
      "Busque por disciplina, cidade ou modalidade. Compare perfis verificados, avaliações e preços de aulas individuais e coletivas.",
  },
  {
    icon: CalendarCheck,
    title: "Solicite e confirme a reserva",
    description:
      "Escolha data e horário, envie o pedido e aguarde a confirmação do professor. Depois disso, finalize o pagamento pelo checkout seguro da plataforma.",
  },
  {
    icon: CreditCard,
    title: "Pague com segurança",
    description:
      "O pagamento é processado por provedores contratados pela plataforma. Você acompanha o status da reserva em Minhas Aulas.",
  },
  {
    icon: MessageCircle,
    title: "Combine detalhes com o professor",
    description:
      "Use as mensagens da plataforma para alinhar conteúdo, material e dúvidas antes da aula.",
  },
  {
    icon: Users,
    title: "Participe da aula",
    description:
      "No horário marcado, acesse a sala online pelo link da reserva ou compareça ao encontro presencial. Depois, avalie a experiência.",
  },
];

const loginOptions = [
  {
    title: "Entrar com e-mail",
    description: "Use o e-mail e a senha cadastrados na criação da conta.",
    href: "/login",
    cta: "Ir para login",
  },
  {
    title: "Entrar com Google",
    description: "Na tela de login ou cadastro, escolha continuar com Google.",
    href: "/login",
    cta: "Fazer login",
  },
  {
    title: "Primeira vez na plataforma?",
    description: "Crie uma conta gratuita de aluno em poucos minutos.",
    href: "/signup",
    cta: "Criar conta",
  },
];

export default function ComoFuncionaPage() {
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
              Guia para alunos
            </div>

            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Como a{" "}
              <span className="bg-gradient-to-r from-primary-600 to-accent bg-clip-text text-transparent">
                Aprendiz Bay
              </span>{" "}
              funciona
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
              A plataforma conecta você a professores verificados para aulas individuais ou
              coletivas. Veja como criar conta, fazer login e participar das aulas com segurança.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Sua jornada como aluno
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Do cadastro à avaliação da aula, tudo acontece dentro da plataforma.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {studentJourney.map((step) => (
              <article
                key={step.title}
                className="rounded-2xl bg-surface p-6 shadow-card ring-1 ring-border/50"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
                  <step.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
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
              Como fazer login
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Já tem conta? Entre para reservar aulas, acompanhar pagamentos e falar com
              professores.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
            {loginOptions.map((option) => (
              <article
                key={option.title}
                className="flex flex-col rounded-2xl bg-surface p-6 shadow-card ring-1 ring-border/50"
              >
                <h3 className="text-lg font-semibold text-foreground">{option.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {option.description}
                </p>
                <Link
                  href={option.href}
                  className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  {option.cta === "Fazer login" ? (
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                  ) : null}
                  {option.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Pronto para começar?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Encontre um professor, entre em uma turma coletiva ou crie sua conta agora.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/search"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary-600 px-6 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700"
            >
              Buscar professores
            </Link>
            <Link
              href="/aulas-coletivas"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-surface px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Ver aulas coletivas
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
