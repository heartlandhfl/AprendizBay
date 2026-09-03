import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LifeBuoy } from "lucide-react";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Central de Ajuda — Aprendiz Bay",
  description:
    "Respostas para dúvidas frequentes sobre cadastro, reservas, pagamentos, aulas coletivas, cancelamentos e privacidade na Aprendiz Bay.",
  alternates: {
    canonical: "/ajuda",
  },
};

const helpSections = [
  {
    title: "Conta e acesso",
    items: [
      {
        question: "Como crio uma conta de aluno?",
        answer:
          "Acesse Cadastro, escolha o perfil de aluno e informe nome, e-mail e senha. Também é possível entrar com Google.",
      },
      {
        question: "Esqueci minha senha. O que faço?",
        answer:
          "Na tela de login, use a opção de recuperação de senha do Firebase Authentication com o e-mail da sua conta.",
      },
      {
        question: "Posso usar a plataforma como professor e aluno?",
        answer:
          "Cada conta tem um perfil principal (aluno ou professor). Para ensinar, crie uma conta de professor em Seja um Professor.",
      },
    ],
  },
  {
    title: "Reservas e aulas",
    items: [
      {
        question: "Como reservo uma aula individual?",
        answer:
          "Encontre um professor na busca, escolha data e horário no perfil dele e envie a solicitação. Depois da confirmação, finalize o pagamento.",
      },
      {
        question: "Como entro em uma aula coletiva?",
        answer:
          "Busque turmas abertas na plataforma, abra a turma desejada, reserve sua vaga e pague pelo checkout. Veja o passo a passo em Aulas Coletivas.",
      },
      {
        question: "Onde vejo minhas aulas agendadas?",
        answer:
          "Depois de fazer login, acesse Minhas Aulas para acompanhar reservas, pagamentos e links das salas online.",
      },
    ],
  },
  {
    title: "Pagamentos e cancelamentos",
    items: [
      {
        question: "Quais formas de pagamento são aceitas?",
        answer:
          "O checkout pode oferecer PIX, cartão e outros meios disponibilizados pelo processador de pagamentos ativo no momento da reserva.",
      },
      {
        question: "Posso cancelar uma aula já paga?",
        answer:
          "As regras de cancelamento e estorno dependem do prazo e de quem cancela. Consulte os Termos de Uso para os detalhes vigentes.",
      },
      {
        question: "A plataforma guarda os dados do meu cartão?",
        answer:
          "Não. O pagamento é feito no ambiente do processador contratado. A Aprendiz Bay não armazena o número completo do cartão.",
      },
    ],
  },
  {
    title: "Privacidade e suporte",
    items: [
      {
        question: "Como excluo minha conta?",
        answer:
          "Em Configurações, você pode solicitar a exclusão da conta. Alguns registros podem ser mantidos por obrigação legal ou integridade do histórico.",
      },
      {
        question: "Como gerencio cookies?",
        answer:
          "Use o botão de preferências de cookies no rodapé ou acesse Configurações para revisar suas escolhas.",
      },
      {
        question: "Ainda preciso de ajuda?",
        answer:
          "Envie sua dúvida pelo formulário de contato ou escreva para o e-mail de suporte da plataforma.",
      },
    ],
  },
];

const quickLinks = [
  { label: "Como funciona", href: "/como-funciona" },
  { label: "Aulas coletivas", href: "/aulas-coletivas" },
  { label: "Fale conosco", href: "/contato" },
  { label: "Termos de uso", href: "/termos" },
  { label: "Privacidade", href: "/privacidade" },
];

export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
          <LifeBuoy className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Central de Ajuda
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Encontre respostas rápidas sobre cadastro, reservas, pagamentos e uso da plataforma.
          Se não encontrar o que precisa, fale com nossa equipe.
        </p>
      </header>

      <section className="mt-10 rounded-3xl bg-muted/40 p-6 ring-1 ring-border/50">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Links úteis
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex items-center gap-1 rounded-full bg-surface px-4 py-2 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:text-primary-700"
              >
                {link.label}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 space-y-12">
        {helpSections.map((section) => (
          <section key={section.title}>
            <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
            <div className="mt-6 space-y-4">
              {section.items.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50"
                >
                  <summary className="cursor-pointer list-none text-base font-semibold text-foreground marker:content-none">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-16 rounded-3xl bg-primary-50 p-6 text-center ring-1 ring-primary-100 sm:p-8">
        <h2 className="text-xl font-bold text-foreground">Não encontrou sua resposta?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Nossa equipe pode ajudar com dúvidas sobre reservas, pagamentos, conta e privacidade.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/contato"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Fale conosco
          </Link>
          <a
            href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {SUPPORT_CONTACT_EMAIL}
          </a>
        </div>
      </section>
    </div>
  );
}
