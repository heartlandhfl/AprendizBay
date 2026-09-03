import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Fale Conosco — Aprendiz Bay",
  description:
    "Entre em contato com a equipe da Aprendiz Bay. Envie dúvidas, sugestões ou solicitações pelo formulário.",
  alternates: {
    canonical: "/contato",
  },
};

export default function ContatoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Fale Conosco
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Tem dúvidas sobre a plataforma, reservas, pagamentos ou privacidade? Preencha o
          formulário abaixo e nossa equipe responderá o mais breve possível.
        </p>
        <p className="text-sm text-muted-foreground">
          Você também pode escrever diretamente para{" "}
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="font-medium text-primary-700 hover:text-primary-600"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
          .
        </p>
      </header>

      <div className="mt-10">
        <ContactForm />
      </div>
    </div>
  );
}
