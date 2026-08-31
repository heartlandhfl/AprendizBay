import type { Metadata } from "next";
import CollectiveClassDetail from "@/components/hubs/CollectiveClassDetail";

interface TurmaPageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: "Turma coletiva — Aprendiz Bay",
  description:
    "Veja vagas, preço por aluno e entre em uma aula coletiva na Aprendiz Bay.",
};

export default function TurmaPage({ params }: TurmaPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <CollectiveClassDetail hubId={params.id} />
    </div>
  );
}
