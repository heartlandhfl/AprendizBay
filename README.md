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

## Deploying

### 1. Firebase (Firestore + Storage rules)

Install the [Firebase CLI](https://firebase.google.com/docs/cli) and log in:

```bash
npm install -g firebase-tools
firebase login
```

From the project root, deploy security rules and indexes (rules files already live in this repo):

```bash
firebase deploy --only firestore:rules,storage
```

To include composite indexes (bookings, collectiveHubs queries):

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Project ID is configured in `.firebaserc` (`aprendiz-bay-dev` by default). Switch projects with `firebase use` if needed.

Enable **Authentication** providers (Email/Password + Google) and add your production domain under **Authorized domains** in the Firebase console.

Populate demo tutors (optional, local only — requires admin credentials in `.env.local`):

```bash
npx tsx scripts/seed.ts
```

### 2. Next.js on Vercel

1. Import this repository in [Vercel](https://vercel.com).
2. Framework preset: **Next.js** (default build: `npm run build`).
3. In **Project → Settings → Environment Variables**, set every variable from `.env.local.example`:

| Variable | Where to get it |
|----------|-------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project settings → Your apps → Web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same Web app config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console → Project settings → Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same Web app config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same Web app config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same Web app config |
| `FIREBASE_ADMIN_PROJECT_ID` | Service account JSON → `project_id` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account JSON → `client_email` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service account JSON → `private_key` (paste with `\n` escapes on one line) |
| `NEXT_PUBLIC_SITE_URL` | Your production URL, e.g. `https://www.aprendizbay.com.br` (Open Graph / `metadataBase`) |

`FIREBASE_ADMIN_*` is required for Server Actions that recompute tutor ratings after reviews. Client features (auth, bookings, hubs) only need the `NEXT_PUBLIC_FIREBASE_*` vars.

4. Deploy. After the first deploy, add the Vercel URL to Firebase **Authorized domains** if you test auth on the preview domain.

### Rules vs app (known gaps)

See the audit comment blocks at the top of `firestore.rules` and `storage.rules`. Notably, reviews require `bookings.status == "completed"`, but the app has no tutor action to mark a booking completed yet — add that before expecting reviews in production.
