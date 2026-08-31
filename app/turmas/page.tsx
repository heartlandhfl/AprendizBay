import type { Metadata } from "next";
import CollectiveClassDetail from "@/components/hubs/CollectiveClassDetail";

export const metadata: Metadata = {
  title: "Turma coletiva — Aprendiz Bay",
  description:
    "Entre em uma aula coletiva, reserve sua vaga e pague com segurança na Aprendiz Bay.",
};

export default function TurmasPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  if (!searchParams.id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Turmas coletivas</h1>
        <p className="mt-2 text-muted-foreground">
          Busque aulas coletivas por disciplina e entre na turma com vagas disponíveis.
        </p>
        <a
          href="/search"
          className="mt-6 inline-flex rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Buscar turmas
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <CollectiveClassDetail hubId={searchParams.id} />
    </div>
  );
}
