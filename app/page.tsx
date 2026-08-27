import { Sparkles } from "lucide-react";
import HeroSearch from "@/components/home/HeroSearch";
import ValueProposition from "@/components/home/ValueProposition";
import CategoryGrid from "@/components/home/CategoryGrid";
import HowItWorks from "@/components/home/HowItWorks";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/60 via-background to-background"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-secondary-200/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-primary-200/20 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:px-8 lg:pb-32 lg:pt-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary-200/60 bg-surface/80 px-4 py-1.5 text-sm font-medium text-primary-700 shadow-card backdrop-blur-sm transition-colors hover:border-primary-300">
              <Sparkles className="h-4 w-4 text-secondary-500" aria-hidden="true" />
              A plataforma de tutoria mais acessível do Brasil
            </div>

            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.1]">
              Aprenda Junto,{" "}
              <span className="bg-gradient-to-r from-primary-600 to-accent bg-clip-text text-transparent">
                Pague Menos
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Conectamos você a professores verificados para aulas individuais ou
              em grupo — online ou presencial, do jeito que funciona para você.
            </p>

            <div className="mt-10 sm:mt-12">
              <HeroSearch />
            </div>
          </div>
        </div>
      </section>

      <ValueProposition />
      <CategoryGrid />
      <HowItWorks />
    </>
  );
}
