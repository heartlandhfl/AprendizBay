# Aprendiz Bay

Plataforma brasileira de tutoria e aprendizado coletivo — um marketplace de professores com foco em aulas coletivas acessíveis.

## Stack

- **Next.js 14** (App Router) — **production on Vercel** (full server runtime)
- **Express** (`server.js`) — local development only (`npm run dev` starts Express + Next together)
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (ícones)

HTTP APIs live in `app/api/**` on Vercel. In local dev, Express mounts legacy `server/api/` routes at `/api` and forwards unmatched `/api/*` (Asaas checkout, Mercado Pago, etc.) to Next.js.

### Pagamentos Asaas

After a tutor accepts a booking, the student pays via Asaas Checkout (`PIX` or `CREDIT_CARD`). The booking summary shows how much goes to the tutor versus the platform fee (`PLATFORM_FEE_PERCENT`, default 10%) before payment confirmation. Both amounts are stored on the booking document (`platformFee`, `tutorAmount`) for reporting.

Paid bookings can be cancelled only through `POST /api/bookings/cancel`. Students get a full Asaas refund (`POST /v3/payments/{id}/refund`) when they cancel at least 24 hours before the class; later student cancellations are blocked and the amount paid is kept. If the tutor cancels a paid booking, the student is always refunded. Refunds use the same `ASAAS_API_KEY` as checkout.

1. `POST /api/payments/create-checkout` creates a sandbox checkout at `https://api-sandbox.asaas.com/v3/checkouts` (or production `https://api.asaas.com/v3/checkouts` when `ASAAS_ENVIRONMENT=production`).
2. The student is redirected to `https://asaas.com/checkoutSession/show?id={id}` (or the `link` returned by Asaas).
3. `POST /api/payments/webhook` confirms the booking only when Asaas reports a successful payment whose amount matches the stored booking price (`externalReference` is the booking ID).
4. `POST /api/bookings/cancel` estorna a cobrança em `POST /v3/payments/{id}/refund` quando a reserva já está paga e o cancelamento é permitido.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Estrutura

```
app/                 # Next.js App Router (UI + app/api routes)
lib/                 # Server modules (firebase-admin, bookings, payments, …)
server/
  attach-next.js     # Loads Next.js after Express is listening (dev only)
  api/               # Legacy Express APIs (local dev + deprecated Hostinger deploy)
server.js            # Express entry for npm run dev / legacy Hostinger
```

## Design System

- **Primária:** Verde esmeralda/teal (crescimento e aprendizado)
- **Secundária:** Âmbar/dourado (destaques e CTAs)
- **Layout:** Bento grid com sombras suaves e `rounded-2xl`
- **Idioma:** Português brasileiro (pt-BR) em toda a interface

## Deploying

**Production target:** [Vercel](https://vercel.com) with the full Next.js runtime (`next build` → serverless Node.js functions for `app/api/**`, Server Actions, and on-demand rendering).

**Legacy / deprecated:** Hostinger Express (`server.js`) serving committed `hostinger-next/` static HTML plus a subset of APIs in `server/api/`. Do not use for new production deploys.

| Target | Role | What runs |
|--------|------|-----------|
| **Vercel** | **Production** | `next build` → `.next` + `app/api/**` + `lib/**/server.ts` + Server Actions + `firebase-admin` |
| **Hostinger Express** (`server.js`) | **Deprecated** | Committed `hostinger-next/` static HTML + `/_next/static` + Express `server/api/*` only |

`next.config.mjs` does **not** set `output: "export"` — API routes, Server Actions, and `firebase-admin` are supported on Vercel. The default `distDir` is `.next`; `npm run build:hostinger` is only for the legacy static export path.

Client Firebase features (auth, Firestore reads/writes from the browser, bookings UI) need `NEXT_PUBLIC_FIREBASE_*` on any target. Server features additionally need `FIREBASE_ADMIN_*` on Vercel.

### Environments

Aprendiz Bay uses **three isolated Firebase projects** and matching Vercel environment scopes. Template files in the repo list every variable name (no secrets committed):

| Environment | Firebase project (`.firebaserc` alias) | Site URL | Env template | Vercel scope |
|-------------|------------------------------------------|----------|--------------|--------------|
| **development** | `aprendiz-bay-dev` (`development`) | `http://localhost:3000` | `.env.development` | Local only (`npm run dev`) |
| **staging** | `aprendiz-bay-staging` (`staging`) | `https://staging.aprendizbay.com.br` | `.env.staging` | **Preview** (or a `staging` branch) |
| **production** | `aprendiz-bay-prod` (`production`) | `https://aprendizbay.com.br` | `.env.production` | **Production** |

**Local development:** copy the development template and fill secrets once per machine:

```bash
cp .env.development .env.local
# edit .env.local — never commit this file
npm run dev
```

**Vercel (one project, three scopes):** import the repo once. In **Project → Settings → Environment Variables**, paste values from `.env.staging` for the **Preview** scope and from `.env.production` for **Production**. Assign `staging.aprendizbay.com.br` to Preview (or a dedicated `staging` branch) and `aprendizbay.com.br` to Production. Set `FIREBASE_ADMIN_*` for **both** build and runtime on each scope so tutor SEO pages can pre-render at build time.

**Firebase rules (all three projects):** `firestore.rules` and `storage.rules` are project-agnostic — they reference collections, paths, and `request.auth` only, with no hard-coded project IDs. Deploy the **same** rules and indexes to each project by switching the CLI alias:

```bash
firebase use development   # aprendiz-bay-dev
firebase deploy --only firestore:rules,firestore:indexes,storage

firebase use staging       # aprendiz-bay-staging
firebase deploy --only firestore:rules,firestore:indexes,storage

firebase use production    # aprendiz-bay-prod
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Add each site hostname under **Firebase Console → Authentication → Authorized domains** for its project before testing sign-in.

### Primeiro administrador (manual no Firestore)

Não há fluxo de cadastro para `role: "admin"`. O primeiro administrador deve ser promovido manualmente no **Firebase Console**:

1. Abra [Firebase Console](https://console.firebase.google.com/) → seu projeto → **Firestore Database**.
2. Coleção `users` → documento do usuário (`users/{uid}`) que será administrador.
3. Edite o campo `role` e altere de `student` ou `tutor` para **`admin`**.
4. Salve o documento.

Somente usuários com `users/{uid}.role == "admin"` podem acessar `/admin` (painel operacional) e `/admin/tutors` (verificação). O painel lê totais reais via `GET /api/admin/dashboard` (`app/api/admin/dashboard` no Vercel; `server/api/admin.js` no Hostinger legado) — o navegador não lista `users` nem `bookings` para montar as métricas. Se uma métrica ainda não puder ser calculada com segurança, a interface mostra **Indisponível**. A revisão operacional (`approve`, `reject`, `request_changes`, `suspend`) grava `verificationStatus`, mantém `isVerified` sincronizado (`true` só quando o status é `approved`) e registra a ação em `adminAuditLogs`. O caminho ao vivo é `POST /api/tutors/review` (`app/api/tutors/review` no Vercel). Professores reenviam com `POST /api/tutors/resubmit` após recusa ou pedido de ajustes. Tutores nunca podem alterar o próprio status.


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

Project aliases are configured in `.firebaserc` (`development`, `staging`, `production`). Switch targets with `firebase use <alias>` before deploying rules or indexes.

Enable **Authentication** providers (Email/Password + Google) and add your production domain under **Authorized domains** in the Firebase console.

Populate demo tutors (optional, local only — requires admin credentials in `.env.local`):

```bash
npx tsx scripts/seed.ts
```

### 2. Vercel — production (full Next.js)

1. Import this repository in [Vercel](https://vercel.com).
2. Framework preset: **Next.js** (default build: `npm run build` per `vercel.json`). Do **not** point Vercel at `server.js`.
3. In **Project → Settings → Build and Deployment**, set **Node.js Version** to **24.x** (or disable any override so it follows `package.json` / `.nvmrc`).
4. Leave **Output Directory** empty (default `.next`). Do not set `hostinger-next` or `output: "export"`.
5. In **Project → Settings → Environment Variables**, set variables from `.env.production` (Production scope) and `.env.staging` (Preview scope). See [Environments](#environments) above.
6. Deploy. Add your production domain to Firebase **Authentication → Authorized domains**.

`vercel.json` sets `framework: "nextjs"`, `buildCommand: "npm run build"`, and `installCommand: "npm install"`.

#### Environment variables (Vercel)

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
| `NEXT_PUBLIC_SITE_URL` | Your production URL, e.g. `https://www.aprendizbay.com.br` (Open Graph / `metadataBase`, payment webhooks) |
| `ASAAS_API_KEY` | Asaas API key (`access_token`). Use a sandbox key (`$aact_hmlg_...`) until you switch environments |
| `ASAAS_ENVIRONMENT` | `sandbox` (default) or `production` |
| `ASAAS_WEBHOOK_TOKEN` | Required shared secret Asaas sends as `asaas-access-token` |
| `MERCADOPAGO_ACCESS_TOKEN` | Mercado Pago server token (Checkout Bricks server calls) |
| `MERCADOPAGO_WEBHOOK_SECRET` | HMAC secret for `POST /api/mercadopago/webhook` |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Mercado Pago public key (Bricks initialization) |
| `EMAIL_PROVIDER` | `jetsend` selects `JetSendEmailProvider`; omit to use the legacy Resend/SendGrid fallback |
| `JETSEND_API_KEY` | [JetSend](https://jetsend.com) API key (required when `EMAIL_PROVIDER=jetsend`) |
| `JETSEND_FROM_EMAIL` | JetSend sender address, e.g. `Aprendiz Bay <noreply@aprendizbay.com.br>` |
| `JETSEND_TENANT_ID` | JetSend tenant UUID (optional, ops reference) |
| `JETSEND_SLUG` | JetSend account slug (optional, ops reference) |
| `JETSEND_TRACKING_DOMAIN` | JetSend verified tracking domain (optional) |
| `JETSEND_WEBHOOK_USERNAME` | HTTP Basic Auth username for `POST /api/webhooks/jetsend` |
| `JETSEND_WEBHOOK_PASSWORD` | HTTP Basic Auth password configured in the JetSend webhook |
| `RESEND_API_KEY` | [Resend](https://resend.com) API key (legacy fallback provider) |
| `SENDGRID_API_KEY` | SendGrid API key (legacy fallback provider) |
| `EMAIL_FROM` | Legacy fallback from header when `JETSEND_FROM_EMAIL` is unset |
| `NOTIFICATIONS_CRON_SECRET` | Bearer token for `/api/notifications/reminders` (external cron or Vercel Cron on Pro) |
| `PLATFORM_FEE_PERCENT` | Percent of each booking kept as the platform fee (`0`–`100`, default `10`) |
| `NEXT_PUBLIC_PLATFORM_FEE_PERCENT` | Optional client alias of `PLATFORM_FEE_PERCENT` |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | Sentry (optional) |
| `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Sentry environment label |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` / `PLAUSIBLE_DOMAIN` | Plausible hostname (optional) |
| `NEXT_PUBLIC_PLAUSIBLE_SRC` / `PLAUSIBLE_API_HOST` | Optional Plausible overrides |

`FIREBASE_ADMIN_*` is required for all server routes below. Client features only need `NEXT_PUBLIC_FIREBASE_*`. Sentry and Plausible are optional.

`GET /api/public-config` also exposes Firebase web keys at runtime (useful for previews); on Vercel you typically set `NEXT_PUBLIC_*` directly and rebuild when they change.

#### API routes (`app/api/**`)

Every route sets `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`. None use the Edge runtime — **all require the Node.js serverless runtime** on Vercel because they use `firebase-admin`, `node:crypto` (webhook HMAC), or Firebase Storage APIs.

| Route | Methods | Purpose | Node.js required (why) |
|-------|---------|---------|--------------------------|
| `/api/account/delete` | POST | LGPD account deletion | `firebase-admin` (Auth, Firestore, Storage) |
| `/api/admin/dashboard` | GET | Admin metrics | `firebase-admin` |
| `/api/bookings` | POST | Create individual booking | `firebase-admin` (transaction) |
| `/api/bookings/cancel` | POST | Cancel + Asaas refund | `firebase-admin` + Asaas HTTP |
| `/api/bookings/complete` | POST | Mark lesson completed | `firebase-admin` |
| `/api/bookings/occupancy` | GET | Occupied tutor slots | `firebase-admin` |
| `/api/hubs/join` | POST | Collective hub join + booking | `firebase-admin` |
| `/api/mercadopago/process-payment` | POST | Mercado Pago payment | `firebase-admin` + MP API |
| `/api/mercadopago/webhook` | GET, POST | Mercado Pago webhook | `node:crypto` HMAC + `firebase-admin` |
| `/api/notifications` | POST | Transactional e-mail | `firebase-admin` + JetSend/Resend/SendGrid |
| `/api/notifications/reminders` | GET, POST | 1-hour lesson reminders (cron) | `firebase-admin` + e-mail |
| `/api/payments/create-checkout` | POST | Asaas checkout session | `firebase-admin` + Asaas API |
| `/api/payments/webhook` | POST | Asaas payment webhook | `node:crypto` + `firebase-admin` |
| `/api/webhooks/jetsend` | POST | JetSend delivery webhook | HTTP Basic Auth + `firebase-admin` |
| `/api/public-config` | GET | Public Firebase / fee / MP key config | Env reads only (still `nodejs`) |
| `/api/reviews` | POST | Create student review | `firebase-admin` |
| `/api/reviews/recompute-rating` | POST | Admin rating recompute | `firebase-admin` |
| `/api/tutors/review` | POST | Admin tutor verification | `firebase-admin` |
| `/api/tutors/resubmit` | POST | Tutor resubmit verification | `firebase-admin` |
| `/api/users/public-profile/[uid]` | GET | Display name + avatar for lessons | `firebase-admin` |

The UI calls these routes directly (e.g. `lib/tutors/review-client.ts` → `/api/tutors/review`). Legacy duplicates exist under `server/api/` for the deprecated Hostinger Express path.

#### Server Actions

| Module | Exports | Runtime | Used by UI? |
|--------|---------|---------|-------------|
| `lib/tutors/actions.ts` | `reviewTutorAction`, `approveTutorAction`, `resubmitTutorAction` | **Node.js** (`firebase-admin` via `lib/tutors/admin-server.ts`) | No — components use `/api/tutors/*` via `review-client.ts` |
| `lib/reviews/actions.ts` | `recomputeTutorRatingAction` (throws — admin-only) | N/A (stub) | No — admins use `POST /api/reviews/recompute-rating` |

Server Actions are available on Vercel but the live UI path is the REST API above. Do not convert routes to Edge without verifying `firebase-admin` and `node:crypto` compatibility.

#### Build-time SSG (not static export)

`tutor/[id]` and `professores/[materia]/[cidade]` use `generateStaticParams()` with `lib/tutors/server.ts` (`firebase-admin`). Vercel runs these at **build time** — set `FIREBASE_ADMIN_*` in the Vercel build environment so tutor pages pre-render. `dynamicParams = true` allows on-demand pages for tutors added after deploy.

### 3. Hostinger — legacy static export (deprecated)

> **Deprecated.** Hostinger served a committed `hostinger-next/` prerender plus Express `server/api/*`. Several features (Asaas checkout/webhook, Mercado Pago, paid cancel/refund) only run on Vercel. Keep this section only if you must maintain an existing Hostinger instance during migration.

Hostinger runs the **slim Express path only**: static `hostinger-next/` + `/api`. Do not enable a Hostinger build step for Next.js.

In hPanel → **Deployments** → **Deployment settings**:

| Setting | Required value |
|---------|----------------|
| Framework / application type | **express** |
| Node.js version | **24** |
| Build command | **leave empty** |
| Output directory | **leave empty** |
| Entry file | **`server.js`** |
| Start command | **`npm start`** |

After UI changes, run `npm run build:hostinger` locally and commit `hostinger-next/` (`cache/` is gitignored). Production installs only Express (`dependencies`); Next.js is a devDependency. Express never loads the Next.js runtime in production (`server/next-runtime-guard.js`). `/api/health` returns `"next":"static"` and `"nextRuntime":false`.

**Limited on Hostinger vs Vercel:**

| Feature | Hostinger | Vercel |
|---------|-----------|--------|
| Asaas checkout + webhook | No | Yes |
| Mercado Pago | No | Yes |
| Paid booking cancel + refund | No | Yes |
| Full `app/api/**` parity | Partial (`server/api/` only) | Yes |
| Server Actions | No | Yes |

Set `NEXT_PUBLIC_SITE_URL`, `FIREBASE_ADMIN_*`, `EMAIL_PROVIDER=jetsend`, `JETSEND_API_KEY`, `JETSEND_FROM_EMAIL`, and `NOTIFICATIONS_CRON_SECRET` in Hostinger environment variables. Firebase web keys are also served at runtime from `GET /api/public-config`.

### Rules vs app (known gaps)

See the audit comment blocks at the top of `firestore.rules` and `storage.rules`. Notably, reviews require `bookings.status == "completed"`, but the app has no tutor action to mark a booking completed yet — add that before expecting reviews in production.
