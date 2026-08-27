import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Code2,
  Globe,
  Languages,
  Music,
  Search,
  Sparkles,
  Star,
  Users,
  Wallet,
} from "lucide-react";

const categories = [
  { name: "Matemática", icon: Calculator, color: "bg-primary-50 text-primary-700" },
  { name: "Inglês", icon: Languages, color: "bg-secondary-50 text-secondary-700" },
  { name: "Programação", icon: Code2, color: "bg-primary-50 text-primary-700" },
  { name: "Música", icon: Music, color: "bg-secondary-50 text-secondary-700" },
  { name: "Redação", icon: BookOpen, color: "bg-primary-50 text-primary-700" },
  { name: "Espanhol", icon: Globe, color: "bg-secondary-50 text-secondary-700" },
];

const featuredTutors = [
  {
    name: "Ana Paula S.",
    subject: "Matemática · ENEM",
    rating: 4.9,
    reviews: 127,
    price: "R$ 45/h",
    location: "São Paulo, SP",
  },
  {
    name: "Carlos M.",
    subject: "Inglês · Conversação",
    rating: 5.0,
    reviews: 89,
    price: "R$ 60/h",
    location: "Rio de Janeiro, RJ",
  },
  {
    name: "Juliana R.",
    subject: "Programação · Python",
    rating: 4.8,
    reviews: 64,
    price: "R$ 80/h",
    location: "Belo Horizonte, MG",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary-50 px-4 py-1.5 text-sm font-medium text-secondary-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Aprendizado coletivo, preços que cabem no bolso
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Encontre seu professor e aprenda em grupo
          </h1>
          <p className="mt-6 text-balance text-lg leading-relaxed text-muted-foreground">
            Conectamos você aos melhores tutores do Brasil. Aulas particulares ou
            coletivas — você escolhe como quer aprender.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/professores"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-700 sm:w-auto"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Encontre seu Professor
            </Link>
            <Link
              href="/seja-professor"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground shadow-card transition-colors hover:bg-muted sm:w-auto"
            >
              Seja um Tutor
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="pb-16 sm:pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {/* Aulas Coletivas — large card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-accent p-6 text-white shadow-soft-lg sm:col-span-2 lg:row-span-2 lg:p-8">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Aulas Coletivas
                </div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Aprenda junto e economize até 60%
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-100 sm:text-base">
                  Forme um grupo com amigos ou entre em turmas abertas. Divida o
                  custo da aula e tenha a mesma qualidade por muito menos.
                </p>
              </div>
              <Link
                href="/aulas-coletivas"
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
              >
                Explorar Turmas
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-white/10" />
            <div className="absolute -right-4 top-8 h-24 w-24 rounded-full bg-white/5" />
          </div>

          {/* Economia */}
          <div className="rounded-2xl bg-surface p-6 shadow-card transition-shadow hover:shadow-soft">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-100 text-secondary-600">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Preços Transparentes
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sem taxas escondidas. Você vê o valor da aula antes de agendar.
            </p>
          </div>

          {/* Avaliações */}
          <div className="rounded-2xl bg-surface p-6 shadow-card transition-shadow hover:shadow-soft">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Star className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Professores Avaliados
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Avaliações reais de alunos para você escolher com confiança.
            </p>
          </div>

          {/* Categorias */}
          <div className="rounded-2xl bg-surface p-6 shadow-card sm:col-span-2 lg:col-span-1">
            <h3 className="text-lg font-semibold text-foreground">
              Matérias Populares
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  href={`/professores?materia=${encodeURIComponent(cat.name)}`}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 ${cat.color}`}
                >
                  <cat.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Professores em Destaque */}
      <section className="pb-16 sm:pb-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Professores em Destaque
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tutores bem avaliados prontos para te ajudar
            </p>
          </div>
          <Link
            href="/professores"
            className="hidden items-center gap-1 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 sm:inline-flex"
          >
            Ver todos
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredTutors.map((tutor) => (
            <article
              key={tutor.name}
              className="rounded-2xl bg-surface p-5 shadow-card transition-shadow hover:shadow-soft"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-sm font-bold text-primary-700">
                  {tutor.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">{tutor.name}</h3>
                  <p className="text-sm text-muted-foreground">{tutor.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {tutor.location}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-1 text-sm">
                  <Star
                    className="h-4 w-4 fill-secondary-400 text-secondary-400"
                    aria-hidden="true"
                  />
                  <span className="font-medium text-foreground">{tutor.rating}</span>
                  <span className="text-muted-foreground">
                    ({tutor.reviews} avaliações)
                  </span>
                </div>
                <span className="text-sm font-semibold text-primary-600">
                  {tutor.price}
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/professores"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600"
          >
            Ver todos os professores
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16 sm:pb-20">
        <div className="rounded-2xl bg-muted p-8 text-center shadow-card sm:p-12">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Pronto para começar a aprender?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Cadastre-se gratuitamente e encontre o professor ideal para seus
            objetivos — seja para o ENEM, concursos ou um novo hobby.
          </p>
          <Link
            href="/cadastro"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-secondary-500 px-6 py-3 text-sm font-semibold text-secondary-foreground shadow-soft transition-colors hover:bg-secondary-600"
          >
            Criar Conta Grátis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
