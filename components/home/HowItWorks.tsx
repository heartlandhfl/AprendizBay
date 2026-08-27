import { GraduationCap, Search, UsersRound } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Encontre seu professor",
    description:
      "Busque por matéria, modalidade ou cidade. Compare perfis, avaliações e preços em poucos cliques.",
  },
  {
    number: "02",
    icon: UsersRound,
    title: "Entre em um hub coletivo",
    description:
      "Junte amigos ou entre em turmas abertas. Divida o custo da aula e aprenda em grupo com mais economia.",
  },
  {
    number: "03",
    icon: GraduationCap,
    title: "Comece a aprender",
    description:
      "Agende sua primeira aula online ou presencial. Acompanhe seu progresso e evolua no seu ritmo.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Como Funciona
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Três passos simples para começar sua jornada de aprendizado
          </p>
        </div>

        {/* Mobile & tablet: vertical timeline */}
        <div className="relative mt-12 lg:hidden">
          <div
            className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-primary-300 via-primary-200 to-transparent"
            aria-hidden="true"
          />
          <div className="space-y-10">
            {steps.map((step) => (
              <div key={step.number} className="relative flex gap-6 pl-2">
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-soft transition-transform duration-300 hover:scale-105">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="pt-1">
                  <span className="text-xs font-bold tracking-widest text-primary-500">
                    PASSO {step.number}
                  </span>
                  <h3 className="mt-1 text-xl font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: alternating horizontal timeline */}
        <div className="relative mt-16 hidden lg:block">
          <div
            className="absolute left-1/2 top-0 h-full w-px -translate-x-px bg-gradient-to-b from-primary-300 via-primary-200 to-transparent"
            aria-hidden="true"
          />

          <div className="space-y-20">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`relative flex items-center ${
                  index % 2 === 1 ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-1/2 ${index % 2 === 0 ? "pr-20 text-right" : "pl-20"}`}
                >
                  <span className="text-sm font-bold tracking-widest text-primary-500">
                    PASSO {step.number}
                  </span>
                  <h3 className="mt-2 text-2xl font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-soft ring-4 ring-background transition-transform duration-300 hover:scale-110">
                    <step.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>

                <div className="w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
