# Smoke and E2E testing (Phase E.1+)

Commit `d8260e1` (PR #142) is merged on `main` and deploys to Vercel production. Use this guide to validate the release before deeper manual QA.

## Prerequisites

### 1. Vercel environment variables

Copy values from the matching template into Vercel (**Preview** for staging, **Production** for prod):

| Template | Firebase project | Site |
|----------|------------------|------|
| `.env.staging` | `aprendiz-bay-staging` | `https://staging.aprendizbay.com.br` |
| `.env.production` | `aprendiz-bay-prod` | `https://www.aprendizbay.com.br` |

**Phase E.1 additions** — confirm these are set on the target scope:

| Variable | Why |
|----------|-----|
| `JITSI_ROOM_SECRET` | Non-guessable Jitsi room names for paid lessons |
| `NOTIFICATIONS_CRON_SECRET` | Bearer token for `GET/POST /api/notifications/reminders` |
| `FIREBASE_ADMIN_*` | Session cookie minting (`POST /api/auth/session`) + APIs |
| `NEXT_PUBLIC_FIREBASE_*` | Client auth (login, signup, dashboards) |
| `EMAIL_ENV` + `RESEND_API_KEY` | Transactional mail (Resend is primary since PR #143) |
| `PAYMENT_PROVIDER` + MP/Asaas keys | Checkout and webhook smoke paths |

> **Vercel Cron:** The every-15-minutes cron in `d8260e1` was removed on Hobby plan (PR #144). Schedule an external cron (e.g. cron-job.org) to `POST /api/notifications/reminders` with `Authorization: Bearer $NOTIFICATIONS_CRON_SECRET` every 15 minutes.

### 2. Firebase rules (all three projects)

Rules from `d8260e1` must be deployed before Firestore/Storage E2E:

```bash
npx firebase-tools login
npx firebase-tools use staging    # or production
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

Repeat for `development` and `production` aliases in `.firebaserc`.

### 3. Firebase Auth authorized domains

Add each hostname under **Authentication → Authorized domains**:

- `localhost` (local dev)
- `staging.aprendizbay.com.br` (Preview)
- `aprendizbay.com.br` / `www.aprendizbay.com.br` (Production)

### 4. Staging deployment on Vercel

If `https://staging.aprendizbay.com.br` returns **DEPLOYMENT_NOT_FOUND**, assign the domain to a Preview deployment in **Vercel → Project → Settings → Domains** and ensure Preview env vars from `.env.staging` are populated.

## Automated smoke tests (HTTP)

No browser required. Hits public routes and auth gates.

```bash
# Against production (after deploy)
BASE_URL=https://www.aprendizbay.com.br npm run test:smoke

# Against staging
BASE_URL=https://staging.aprendizbay.com.br npm run test:smoke

# Local (start dev server first)
npm run dev
BASE_URL=http://localhost:3000 npm run test:smoke
```

Checks: homepage, `/api/public-config`, marketing pages, protected-route redirects, session API rejection, `robots.txt`, `sitemap.xml`.

## Playwright E2E

```bash
npm install
npx playwright install chromium

# Local
npm run dev
BASE_URL=http://localhost:3000 npm run test:e2e

# Staging or production
BASE_URL=https://www.aprendizbay.com.br npm run test:e2e
```

Current specs (`e2e/smoke.spec.ts`): homepage shell, login form, professor listing, auth redirects for `/dashboard` and `/admin`, public-config API.

### Manual E2E flows (post-smoke)

Run these after automated smoke passes:

| Flow | Roles | Key paths |
|------|-------|-----------|
| Student signup + email verify | student | `/signup` → `/verify-email` → `/dashboard` |
| Tutor onboarding | lecturer | `/signup?role=tutor` → `/tutor/onboarding` |
| Booking + payment | student + lecturer | search → book → tutor accept → MP/Asaas checkout → webhook |
| Lesson join | student + lecturer | `/aulas/[id]` with suffixed Jitsi URL when `JITSI_ROOM_SECRET` is set |
| Cancel + refund | student | `POST /api/bookings/cancel` after paid booking |
| Admin verification | admin | `bootstrap-admin.ts` → `/admin/tutors` |

## Local development bootstrap

```bash
cp .env.development .env.local
# Fill Firebase, Resend, payment sandbox keys, JITSI_ROOM_SECRET
npm install
npm run dev
npm test
BASE_URL=http://localhost:3000 npm run test:smoke
```

## CI

`npm test` (unit + rules + node integration) runs on every PR via `.github/workflows/ci.yml`. Smoke and Playwright E2E are run manually against deployed targets using the commands above.
