import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Languages, Music2 } from "lucide-react";

const categories = [
  {
    name: "Idiomas",
    description: "Inglês, Espanhol, Francês e mais",
    href: "/professores?categoria=idiomas",
    icon: Languages,
    gradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/5",
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-100",
  },
  {
    name: "Programação",
    description: "Python, JavaScript, dados e web",
    href: "/professores?categoria=programacao",
    icon: Code2,
    gradient: "from-emerald-500/20 via-teal-500/10 to-cyan-500/5",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
  {
    name: "Reforço Escolar",
    description: "Matemática, Física, ENEM e vestibular",
    href: "/professores?categoria=reforco",
    icon: BookOpen,
    gradient: "from-amber-500/20 via-orange-500/10 to-yellow-500/5",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
  },
  {
    name: "Artes & Música",
    description: "Violão, piano, desenho e canto",
    href: "/professores?categoria=artes",
    icon: Music2,
    gradient: "from-rose-500/20 via-pink-500/10 to-fuchsia-500/5",
    iconColor: "text-rose-600",
    iconBg: "bg-rose-100",
  },
];

export default function CategoryGrid() {
  return (
    <section className="bg-muted/40 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Explore por Categoria
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              As matérias mais buscadas pelos nossos alunos
            </p>
          </div>
          <Link
            href="/professores"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
          >
            Ver todas as matérias
            <ArrowRight className="h-4 w-4 transition-transform hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="-mx-4 mt-10 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className={`group relative min-w-[260px] flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${category.gradient} bg-surface p-6 shadow-card ring-1 ring-border/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-soft-lg hover:ring-primary-200/50 sm:min-w-0`}
            >
              <div
                className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${category.iconBg} transition-transform duration-300 group-hover:scale-110`}
              >
                <category.icon
                  className={`h-7 w-7 ${category.iconColor}`}
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                {category.name}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {category.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 opacity-0 transition-all duration-300 group-hover:opacity-100">
                Explorar
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
              <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/40 blur-2xl transition-opacity duration-300 group-hover:opacity-80" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
