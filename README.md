# Aprendiz Bay

Plataforma brasileira de tutoria e aprendizado coletivo — um marketplace de professores com foco em aulas coletivas acessíveis.

## Stack

- **Next.js 14** (App Router) served by **Express** (`server.js`)
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (ícones)

HTTP APIs live in `server/api/` and are mounted at `/api`. `npm run dev` starts Express + Next together. Unmatched `/api/*` routes (including Asaas checkout) are forwarded to Next.js in development.

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
| **Hostinger Express** (`server.js`) | Primary production site | Committed `hostinger-next/` static HTML + `/_next/static` + Express `/api/*` | Default — no Next.js runtime. `firebase-admin` is loaded only by `server/api/` (review rating recompute, tutor verification) |
| **Vercel** (or similar Next host) | Optional full Next.js runtime | `next build` + Server Actions, `lib/**/server.ts`, `app/api/**`, `firebase-admin` | Preview/staging or a later migration — not required for review recompute |

**Hostinger path (current):** `npm install --omit=dev` → `node server.js`. UI is prebuilt and committed; Express never loads Next.js. A valid review updates the tutor rating in `POST /api/reviews`; only admins may call `POST /api/reviews/recompute-rating` (`server/api/reviews.js`). Add other backend behavior in `server/api/` (plain JS).

**Vercel path (optional, not required today):** Standard Next.js deploy with `FIREBASE_ADMIN_*` for server modules. Can run alongside Hostinger (e.g. preview/staging) or replace it later — that is a separate migration decision, not covered here.

Client Firebase features (auth, Firestore reads/writes from the browser, bookings UI) work on **both** targets with `NEXT_PUBLIC_FIREBASE_*` only.

### Primeiro administrador (manual no Firestore)

Não há fluxo de cadastro para `role: "admin"`. O primeiro administrador deve ser promovido manualmente no **Firebase Console**:

1. Abra [Firebase Console](https://console.firebase.google.com/) → seu projeto → **Firestore Database**.
2. Coleção `users` → documento do usuário (`users/{uid}`) que será administrador.
3. Edite o campo `role` e altere de `student` ou `tutor` para **`admin`**.
4. Salve o documento.

Somente usuários com `users/{uid}.role == "admin"` podem acessar `/admin` (painel operacional) e `/admin/tutors` (verificação). O painel lê totais reais via `GET /api/admin/dashboard` (`server/api/admin.js` no Hostinger e `app/api/admin/dashboard` no Next) — o navegador não lista `users` nem `bookings` para montar as métricas. Se uma métrica ainda não puder ser calculada com segurança, a interface mostra **Indisponível**. A revisão operacional (`approve`, `reject`, `request_changes`, `suspend`) grava `verificationStatus`, mantém `isVerified` sincronizado (`true` só quando o status é `approved`) e registra a ação em `adminAuditLogs`. O caminho ao vivo é `POST /api/tutors/review` (`server/api/tutors.js` no Hostinger e `app/api/tutors/review` no Next). Professores reenviam com `POST /api/tutors/resubmit` após recusa ou pedido de ajustes. Tutores nunca podem alterar o próprio status.


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
| Node.js version | **24** |
| Build command | **leave empty** (not required — `hostinger-next/` is committed; Hostinger only needs `npm install --omit=dev` + `node server.js`) |
| Output directory | **leave empty** (do not set `.next` or `dist`) |
| Entry file | **`server.js`** |
| Start command | **`npm start`** (or `NODE_ENV=production node server.js`) |

Then **Save and redeploy**.

Hostinger copies **git-tracked files** into `hbuilds` and does not keep untracked `next build` output. After changing UI code, run `npm run build:hostinger` **locally** and **commit `hostinger-next/`** (webpack `cache/` is gitignored).

Production installs only **Express** (`dependencies` in `package.json`). Next.js, React, Firebase, TypeScript, Tailwind, and `@types/*` are **devDependencies** — they are not installed on the server. Production **does not load the Next.js runtime** in `server.js` (that OOMs Hostinger LiteSpeed and returns 503, including `/api/health`). Express serves the prerendered HTML and `/_next/static` from `hostinger-next/`. After deploy, `/api/health` should return `"next":"static"` and `"nextRuntime":false`.

**firebase-admin on Hostinger is limited to Express `server/api/`.** Next.js server modules (`lib/tutors/server.ts`, `lib/bookings/server.ts`, `lib/reviews/server.ts`) and committed `hostinger-next/server/**/*.js` bundles are still build-time only — Express never `require()`s those files or executes those JS chunks; it only streams the prerendered `.html` / `.rsc` files. `server/next-runtime-guard.js` still blocks `require("next")` and blocks `firebase-admin` unless the caller is `server/api/` (or `node_modules/firebase-admin/`). Static UI and client Firebase features only need `NEXT_PUBLIC_FIREBASE_*`. Review rating updates also need `FIREBASE_ADMIN_*` so `POST /api/reviews` and admin-only `POST /api/reviews/recompute-rating` can update `tutors.rating` / `reviewCount`.

**Server features that need firebase-admin do not run on Hostinger today:**

| Feature | Module | Hostinger behavior |
|---------|--------|-------------------|
| Tutor SSG data | `lib/tutors/server.ts` | Runs at `npm run build:hostinger` locally; HTML is committed in `hostinger-next/` |
| Booking webhook confirm | `lib/bookings/server.ts` via `POST /api/payments/webhook` | Next.js only (Vercel / `npm run dev`). Not on Hostinger Express |
| Asaas checkout create | `POST /api/payments/create-checkout` | Next.js only. Student pays after the tutor accepts the booking |
| Paid booking cancel + Asaas refund | `POST /api/bookings/cancel` | Next.js only. Enforces the 24h free-cancellation rule and refunds via Asaas |
| Review rating recompute | `server/api/reviews.js` via `POST /api/reviews` after a valid create, or admin-only `POST /api/reviews/recompute-rating` | Hostinger Express updates `tutors.rating` / `reviewCount` from legitimate reviews using the booking tutorId. Arbitrary recomputation requires an admin token. Vercel uses the same URLs. Needs `FIREBASE_ADMIN_*`. |
| Account deletion (LGPD) | `server/api/account.js` via `POST /api/account/delete` | Deletes `users/{uid}` and anonymizes bookings/reviews (does not delete those docs). Needs `FIREBASE_ADMIN_*`. Vercel uses `app/api/account/delete` |
| Transactional e-mail | `lib/notifications/` via `POST /api/notifications` | Pending booking (tutor), confirmed lesson link (student), new review (tutor). Hostinger: `server/api/notifications.js`. Vercel: `app/api/notifications`. Needs `RESEND_API_KEY` or `SENDGRID_API_KEY` plus `FIREBASE_ADMIN_*` |
| Lesson reminder (1h) | `GET/POST /api/notifications/reminders` | Call this path every 15 minutes from Hostinger cron or an external ping (`NOTIFICATIONS_CRON_SECRET`). Vercel Hobby cannot run sub-daily crons, so `vercel.json` does not schedule it |
| Tutor approval (`isVerified`) | `lib/tutors/admin-server.ts` via `lib/tutors/actions.ts` | Server Action POST never runs without Next.js — use Firestore console or deploy to Vercel |

`/api/health` includes `"firebaseAdminRuntime"` — `false` until a `server/api/` route (review recompute) initializes the admin SDK, then `true`.

Firebase web keys are read at **runtime** from Hostinger environment variables (`GET /api/public-config`). You do not need to rebuild `hostinger-next/` just to change `NEXT_PUBLIC_FIREBASE_*`. Set those keys under **Environment variables**, then restart the Node app.

Add routes in `server/api/` and mount them from `server/api/index.js` (they are served at `/api/...`). Example: `GET /api/health`, `POST /api/reviews/recompute-rating`, `POST /api/account/delete`.

Set environment variables under **Environment variables**, including:

```text
NEXT_PUBLIC_SITE_URL=https://teal-penguin-833668.hostingersite.com
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
RESEND_API_KEY=
EMAIL_FROM=Aprendiz Bay <noreply@aprendizbay.com.br>
NOTIFICATIONS_CRON_SECRET=
```

and every Firebase key from `.env.local.example`. `FIREBASE_ADMIN_*` is required for `POST /api/reviews/recompute-rating` and e-mail lookups. Add `teal-penguin-833668.hostingersite.com` to Firebase **Authentication → Authorized domains**.

### 3. Vercel — full Next.js (optional Server Actions target)

Use Vercel (or Netlify, Railway, a VPS with `next start`, etc.) when you need the **full Next.js server** — Server Actions, on-demand rendering, or `firebase-admin` without rewriting logic into `server/api/`. This is optional; Hostinger production does not depend on it.

1. Import this repository in [Vercel](https://vercel.com).
2. Framework preset: **Next.js** (default build: `npm run build`). Do **not** point Vercel at `server.js` — use the Next.js preset so Server Actions work.
3. In **Project → Settings → Build and Deployment**, set **Node.js Version** to **24.x** (or disable any override so it follows `package.json` / `.nvmrc`). If the dashboard still pins **20.x**, Vercel will warn and builds will fail after 2026-10-01.
4. Leave **Output Directory** empty (default `.next`). Do not set `hostinger-next`.
5. In **Project → Settings → Environment Variables**, set every variable from `.env.local.example`:

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
| `ASAAS_API_KEY` | Asaas API key (`access_token`). Use a sandbox key (`$aact_hmlg_...`) until you switch environments |
| `ASAAS_ENVIRONMENT` | `sandbox` (default, `https://api-sandbox.asaas.com/v3`) or `production` (`https://api.asaas.com/v3`) |
| `ASAAS_WEBHOOK_TOKEN` | Required shared secret Asaas sends as `asaas-access-token`. Missing or wrong tokens reject the webhook without changing bookings |
| `RESEND_API_KEY` | [Resend](https://resend.com) API key (preferred mailer) |
| `SENDGRID_API_KEY` | SendGrid API key (used if Resend is unset) |
| `EMAIL_FROM` | From header, e.g. `Aprendiz Bay <noreply@aprendizbay.com.br>` |
| `NOTIFICATIONS_CRON_SECRET` | Bearer token for `/api/notifications/reminders` (Hostinger/external cron; not scheduled in `vercel.json` on Hobby) |
| `PLATFORM_FEE_PERCENT` | Percent of each booking kept as the platform fee (`0`-`100`, default `10`). Stored as `platformFee` + `tutorAmount` on the booking |
| `NEXT_PUBLIC_PLATFORM_FEE_PERCENT` | Optional client alias of `PLATFORM_FEE_PERCENT` (same default) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry project DSN (client + optional server fallback). Safe to expose; no PII is sent |
| `SENTRY_DSN` | Optional server-only Sentry DSN for Express / Next API routes |
| `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Sentry environment label (`production`, `development`, …) |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` / `PLAUSIBLE_DOMAIN` | Plausible site hostname (cookie-free analytics). Custom events: `sign_up`, `search`, `profile_view`, `booking_started`, `payment_completed` |
| `NEXT_PUBLIC_PLAUSIBLE_SRC` | Optional Plausible script URL (default `https://plausible.io/js/script.manual.js`) |
| `PLAUSIBLE_API_HOST` | Optional Events API host for server-side `payment_completed` (default `https://plausible.io`) |

`FIREBASE_ADMIN_*` is required on **Hostinger** for `POST /api/reviews/recompute-rating` and `POST /api/account/delete`, and on **Vercel** for the matching App Router routes / Server Actions. Client features (auth, bookings, hubs) only need the `NEXT_PUBLIC_FIREBASE_*` vars on either target. Sentry and Plausible keys are optional — leave them empty to disable tracking. Client keys are also served at runtime from `GET /api/public-config` so Hostinger does not need a rebuild to enable them.

6. Deploy. After the first deploy, add the Vercel URL to Firebase **Authorized domains** if you test auth on the preview domain.

To use both targets: keep the public site on Hostinger and deploy Vercel to a subdomain (e.g. `app.aprendizbay.com.br`) or preview URL for features that need Server Actions. Routing users between them is outside this repo — plan DNS and links when you actually need the split.

### Rules vs app (known gaps)

See the audit comment blocks at the top of `firestore.rules` and `storage.rules`. Notably, reviews require `bookings.status == "completed"`, but the app has no tutor action to mark a booking completed yet — add that before expecting reviews in production.
