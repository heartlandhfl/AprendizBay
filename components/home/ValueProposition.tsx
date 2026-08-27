import { BadgeCheck, UserRound, Users } from "lucide-react";

const features = [
  {
    icon: UserRound,
    title: "Aulas Individuais Acessíveis",
    description:
      "Atenção personalizada com preços justos. Encontre tutores que cabem no seu orçamento, sem abrir mão da qualidade.",
    gradient: "from-primary-500/10 to-primary-600/5",
    iconBg: "bg-primary-100 text-primary-600",
  },
  {
    icon: Users,
    title: "Aprendizado Coletivo",
    description:
      "Divida o valor com a galera. Forme um grupo ou entre em turmas abertas e economize até 60% em cada aula.",
    gradient: "from-secondary-400/15 to-secondary-500/5",
    iconBg: "bg-secondary-100 text-secondary-600",
  },
  {
    icon: BadgeCheck,
    title: "Professores Verificados",
    description:
      "Tutores locais e online com perfil verificado, avaliações reais e histórico comprovado na plataforma.",
    gradient: "from-accent/10 to-primary-400/5",
    iconBg: "bg-teal-100 text-teal-600",
  },
];

export default function ValueProposition() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Por que escolher a Aprendiz Bay?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Uma nova forma de aprender no Brasil — acessível, colaborativa e
            confiável.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${feature.gradient} bg-surface p-8 shadow-card ring-1 ring-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg hover:ring-primary-200/60`}
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${feature.iconBg} transition-transform duration-300 group-hover:scale-110`}
              >
                <feature.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
