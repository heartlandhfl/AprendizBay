import { Scale } from "lucide-react";

export default function LegalReviewBanner() {
  return (
    <aside
      className="rounded-2xl border border-secondary-200 bg-secondary-50 px-4 py-4 text-sm leading-relaxed text-secondary-900 sm:px-5"
      role="note"
    >
      <div className="flex gap-3">
        <Scale className="mt-0.5 h-5 w-5 shrink-0 text-secondary-600" aria-hidden="true" />
        <div>
          <p className="font-semibold">Rascunho pendente de revisão jurídica</p>
          <p className="mt-1 text-secondary-800">
            Este texto descreve o funcionamento atual da Aprendiz Bay e os direitos
            previstos na LGPD, mas{" "}
            <strong>não deve ser publicado como documento final</strong> sem
            revisão por advogada ou advogado. Conformidade com a LGPD, o Código
            de Defesa do Consumidor e o Marco Civil da Internet não pode
            depender só de um rascunho gerado por inteligência artificial.
          </p>
        </div>
      </div>
    </aside>
  );
}
