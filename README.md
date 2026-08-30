# Aprendiz Bay

Plataforma brasileira de tutoria e aprendizado coletivo — um marketplace de professores com foco em aulas coletivas acessíveis.

## Stack

- **Next.js 14** (App Router) served by **Express** (`server.js`)
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (ícones)

HTTP APIs live in `server/api/` and are mounted at `/api`. `npm run dev` starts Express + Next together.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Estrutura

```
app/                 # Next.js App Router (UI)
server/
  attach-next.js     # Loads Next.js after Express is listening
  api/               # HTTP APIs mounted at /api (plain JS, no compile step)
server.js            # Hostinger Express entry
```

## Design System

- **Primária:** Verde esmeralda/teal (crescimento e aprendizado)
- **Secundária:** Âmbar/dourado (destaques e CTAs)
- **Layout:** Bento grid com sombras suaves e `rounded-2xl`
- **Idioma:** Português brasileiro (pt-BR) em toda a interface

## Deploying

This repo supports a **two-target** setup. Production today stays on the slim Hostinger path; nothing in this document migrates hosting for you.

| Target | Role | What runs | When to use |
|--------|------|-----------|-------------|
| **Hostinger Express** (`server.js`) | Primary production site | Committed `hostinger-next/` static HTML + `/_next/static` + Express `/api/*` | Default — low memory, no Next.js or `firebase-admin` in the Node process |
| **Vercel** (or similar Next host) | Optional full Next.js runtime | `next build` + Server Actions, `lib/**/server.ts`, `firebase-admin` | Later, if you need Server Actions (e.g. review rating recompute) without porting them to Express |

**Hostinger path (current):** `npm install --omit=dev` → `node server.js`. UI is prebuilt and committed; Express never loads Next or `firebase-admin`. Add new backend behavior in `server/api/` (plain JS).

**Vercel path (optional, not required today):** Standard Next.js deploy with `FIREBASE_ADMIN_*` for server modules. Can run alongside Hostinger (e.g. preview/staging) or replace it later — that is a separate migration decision, not covered here.

Client Firebase features (auth, Firestore reads/writes from the browser, bookings UI) work on **both** targets with `NEXT_PUBLIC_FIREBASE_*` only.

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

### 2. Hostinger — static UI + Express `/api` (production target)

Hostinger runs the **slim Express path only**: static `hostinger-next/` + `/api`. Do not enable a Hostinger build step for Next.js.

In hPanel → **Deployments** → **Deployment settings**:

| Setting | Required value |
|---------|----------------|
| Framework / application type | **express** |
| Node.js version | **22** |
| Build command | **leave empty** (not required — `hostinger-next/` is committed; Hostinger only needs `npm install --omit=dev` + `node server.js`) |
| Output directory | **leave empty** (do not set `.next` or `dist`) |
| Entry file | **`server.js`** |
| Start command | **`npm start`** (or `NODE_ENV=production node server.js`) |

Then **Save and redeploy**.

Hostinger copies **git-tracked files** into `hbuilds` and does not keep untracked `next build` output. After changing UI code, run `npm run build` **locally** and **commit `hostinger-next/`** (webpack `cache/` is gitignored).

Production installs only **Express** (`dependencies` in `package.json`). Next.js, React, Firebase, TypeScript, Tailwind, and `@types/*` are **devDependencies** — they are not installed on the server. Production **does not load the Next.js runtime** in `server.js` (that OOMs Hostinger LiteSpeed and returns 503, including `/api/health`). Express serves the prerendered HTML and `/_next/static` from `hostinger-next/`. After deploy, `/api/health` should return `"next":"static"` and `"nextRuntime":false`.

**firebase-admin is not used on Hostinger.** It only appears in Next.js server modules (`lib/tutors/server.ts`, `lib/bookings/server.ts`, `lib/reviews/server.ts`) and in committed `hostinger-next/server/**/*.js` bundles from the local build. Express never `require()`s those modules or executes those JS chunks — it only streams the prerendered `.html` / `.rsc` files. `server/next-runtime-guard.js` blocks `require("firebase-admin")` in production as a safety net. You do **not** need `FIREBASE_ADMIN_*` on Hostinger for the static UI or client Firebase features.

**Server features that need firebase-admin do not run on Hostinger today:**

| Feature | Module | Hostinger behavior |
|---------|--------|-------------------|
| Tutor SSG data | `lib/tutors/server.ts` | Runs at `npm run build` locally; HTML is committed in `hostinger-next/` |
| Booking webhook confirm | `lib/bookings/server.ts` | Not wired to Express yet |
| Review rating recompute | `lib/reviews/server.ts` via `lib/reviews/actions.ts` | Server Action POST never runs without Next.js — ratings are **not** recomputed after a review until you add an Express API (`server/api/`) or deploy to Vercel / another Next host |

`/api/health` includes `"firebaseAdminRuntime":false` so you can confirm the admin SDK never initialized in the Node process.

Firebase web keys are read at **runtime** from Hostinger environment variables (`GET /api/public-config`). You do not need to rebuild `hostinger-next/` just to change `NEXT_PUBLIC_FIREBASE_*`. Set those keys under **Environment variables**, then restart the Node app.

Add routes in `server/api/` and mount them from `server/api/index.js` (they are served at `/api/...`). Example: `GET /api/health`.

Set environment variables under **Environment variables**, including:

```text
NEXT_PUBLIC_SITE_URL=https://teal-penguin-833668.hostingersite.com
```

and every Firebase key from `.env.local.example`. Add `teal-penguin-833668.hostingersite.com` to Firebase **Authentication → Authorized domains**.

### 3. Vercel — full Next.js (optional Server Actions target)

Use Vercel (or Netlify, Railway, a VPS with `next start`, etc.) when you need the **full Next.js server** — Server Actions, on-demand rendering, or `firebase-admin` without rewriting logic into `server/api/`. This is optional; Hostinger production does not depend on it.

1. Import this repository in [Vercel](https://vercel.com).
2. Framework preset: **Next.js** (default build: `npm run build`). Do **not** point Vercel at `server.js` — use the Next.js preset so Server Actions work.
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

`FIREBASE_ADMIN_*` is required on **Vercel** for Server Actions that recompute tutor ratings after reviews. It is **not** required on Hostinger — see [Hostinger](#2-hostinger--static-ui--express-api-production-target). Client features (auth, bookings, hubs) only need the `NEXT_PUBLIC_FIREBASE_*` vars on either target.

4. Deploy. After the first deploy, add the Vercel URL to Firebase **Authorized domains** if you test auth on the preview domain.

To use both targets: keep the public site on Hostinger and deploy Vercel to a subdomain (e.g. `app.aprendizbay.com.br`) or preview URL for features that need Server Actions. Routing users between them is outside this repo — plan DNS and links when you actually need the split.

### Rules vs app (known gaps)

See the audit comment blocks at the top of `firestore.rules` and `storage.rules`. Notably, reviews require `bookings.status == "completed"`, but the app has no tutor action to mark a booking completed yet — add that before expecting reviews in production.
