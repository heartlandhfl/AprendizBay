# Aprendiz Bay

Plataforma brasileira de tutoria e aprendizado coletivo — um marketplace de professores com foco em aulas coletivas acessíveis.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (ícones)

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Estrutura

```
app/
  layout.tsx       # Layout global (Navbar + Footer)
  page.tsx         # Página inicial
  globals.css      # Estilos globais e variáveis CSS
components/
  layout/
    Navbar.tsx     # Barra de navegação responsiva
    Footer.tsx     # Rodapé minimalista
```

## Design System

- **Primária:** Verde esmeralda/teal (crescimento e aprendizado)
- **Secundária:** Âmbar/dourado (destaques e CTAs)
- **Layout:** Bento grid com sombras suaves e `rounded-2xl`
- **Idioma:** Português brasileiro (pt-BR) em toda a interface
