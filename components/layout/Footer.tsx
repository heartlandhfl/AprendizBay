import Link from "next/link";
import { GraduationCap } from "lucide-react";

const footerLinks = {
  plataforma: [
    { label: "Encontre um Professor", href: "/professores" },
    { label: "Aulas Coletivas", href: "/aulas-coletivas" },
    { label: "Seja um Professor", href: "/seja-professor" },
    { label: "Como Funciona", href: "/como-funciona" },
  ],
  suporte: [
    { label: "Central de Ajuda", href: "/ajuda" },
    { label: "Fale Conosco", href: "/contato" },
    { label: "Termos de Uso", href: "/termos" },
    { label: "Privacidade", href: "/privacidade" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 text-primary-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-white">
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-lg font-bold">Aprendiz Bay</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              A plataforma brasileira que conecta alunos e professores com aulas
              particulares e coletivas acessíveis. Aprenda junto, pague menos.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Plataforma</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.plataforma.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Suporte</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.suporte.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Aprendiz Bay. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            Feito com dedicação para o Brasil 🇧🇷
          </p>
        </div>
      </div>
    </footer>
  );
}
