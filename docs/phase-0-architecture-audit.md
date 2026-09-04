# AprendizBay — Phase 0: Dashboard & Marketplace Architecture Audit

**Date:** 2026-09-04
**Scope:** Repository-wide read-only audit. No product behavior was changed.
**Constraint:** Do not rebuild payment, booking, messaging, collective-class, facilitator, authentication, or Firestore-security systems.

---

## Executive summary

The marketplace core is already implemented end-to-end. Students can discover tutors and group classes, message a lecturer, request a booking, pay, attend via a Jitsi link, and review. Lecturers can onboard, set prices and availability, create collective hubs, accept requests, teach, and mark lessons complete. Facilitators have referral links, attribution, commissions, and an admin payout path.

What is **not** implemented is a coherent **dashboard product layer** on top of those flows. There is no `lib/auth/dashboard.ts`. Students land on `/bookings`. Lecturers land on `/tutor/onboarding` then a stacked `/tutor/dashboard`. Facilitators have `/facilitador` but it is not in the navbar. Canonical role `lecturer` is already defined, but several UI gates still require the legacy profile value `tutor`.

The classroom is a **Jitsi URL stored on the booking**, generated at payment confirmation. There is no `ClassroomProvider` interface. Consumption (`parseSafeMeetingUrl` + “open in new tab”) is mostly provider-agnostic; **generation is not**. Group classes currently get **one Jitsi room per student booking**, not a shared classroom.

**Smallest change set before dashboard work:** (1) treat `tutor` ≡ `lecturer` in every UI gate and redirect, (2) add a thin role-based dashboard router, (3) introduce a `ClassroomProvider` that only wraps meeting-URL generation so Pencil Spaces can replace Jitsi later without touching bookings or dashboards.

---

## 1. What already exists and should be reused

### App routes (App Router)

| Route | Role | Reuse as |
|---|---|---|
| `/` | Public | Discover (hero search, categories, how-it-works) |
| `/search` | Public | Primary marketplace (tutors + open hubs) |
| `/professores`, `/professores/[materia]/[cidade]` | Public SEO | Compare / index; not the live filter UI |
| `/tutor/[id]` | Public profile | Compare + contact + book |
| `/seja-professor` | Marketing | Lecturer acquisition |
| `/aulas-coletivas` | Marketing | Group-learning explainer (not the catalog) |
| `/turmas`, `/turmas/[id]`, `/turmas?id=` | Public | Group class detail + join |
| `/signup`, `/login` | Auth | Student/lecturer signup |
| `/bookings` | Authenticated | **Current student home**; also a lecturer booking workspace |
| `/tutor/onboarding` | Lecturer | Profile create wizard |
| `/tutor/dashboard` | Lecturer | Availability, hubs, pending + confirmed bookings |
| `/tutor/settings` | Lecturer | Profile edit |
| `/aulas`, `/aulas/[bookingId]` | Authenticated | Lesson / attend |
| `/mensagens`, `/mensagens/[conversationId]` | Authenticated | Contact |
| `/configuracoes` | Authenticated | Account / LGPD |
| `/facilitador` | Authenticated + facilitator record | Referral metrics |
| `/r/[code]` | Public | Referral landing → cookie → `/signup` |
| `/admin/*` | Admin claim | Operations (do not use as user dashboards) |

`lib/auth/dashboard.ts` **does not exist**. Post-login routing lives in `lib/auth/redirects.ts`.

### Authentication and roles

Canonical roles in `lib/auth/roles.ts`:

`student | lecturer | admin | facilitator | support`

- Privileged access uses Firebase Auth **custom claims** (`request.auth.token.role`).
- Firestore `users/{uid}.role` is profile metadata, synced by Admin SDK.
- Legacy profile value `tutor` **is** `lecturer`. UI label is **Professor**.
- Signup still writes `role: "tutor"` (`SIGNUP_ROLES`), then `POST /api/auth/sync-signup-role` grants claim `lecturer` and `setRole()` rewrites the profile to `lecturer`.
- Client auth: `lib/auth/AuthContext.tsx`, `lib/auth/service.ts`, `useRequireAuth`, `components/auth/*`.
- Server auth: `lib/auth/role-server.ts`, `lib/auth/admin-server.ts`, `scripts/manage-role.ts`, `scripts/migrate-role-claims.ts`.
- Plan: `docs/role-migration-plan.md`.

### Firestore collections (live schema in `firestore.rules`)

`users`, `users/{uid}/public/profile`, `tutors`, `tutors/{id}/availability`, `collectiveHubs`, `collectiveHubs/{id}/participants`, `bookings`, `reviews`, `conversations` + `messages`, `messageRateLimits`, `userBlocks`, `conversationReports`, `payments`, `tutorPayouts`, `facilitators`, `referrals`, `commissions`, `facilitatorPayouts`, `facilitatorReferralFlags`, `lessonSlots`, webhook receipts, `adminAuditLogs`, `emailOutbox`, `contactInbox`.

### Marketplace (student discover → compare)

- Search UI: `components/search/SearchResults.tsx`, `SearchFilters.tsx`, `TutorCard.tsx`.
- Tutor fetch: `lib/tutors/client.ts`, `lib/tutors/search.ts`, `lib/tutors/server.ts` (SEO).
- Public profile: `app/tutor/[id]/page.tsx` + `components/tutor/*`.
- Home: `components/home/HeroSearch.tsx` (does navigate to `/search`).

### Bookings (request/book)

- Types: `lib/bookings/types.ts` — `individual | coletivo`, statuses `pending | confirmed | cancelled | completed`.
- Create individual: `POST /api/bookings` → `lib/bookings/create-booking.js` (Admin transaction + `lessonSlots` lock + occupancy).
- Create collective: `POST /api/hubs/join` → `lib/hubs/join-and-book.js` (participant doc + occupancy count + booking).
- Client wrappers: `lib/bookings/service.ts`, `components/tutor/BookingWidget.tsx`.
- Accept (lecturer): **client** `updateDoc` of `paymentStatus: "awaiting_payment"` — allowed by rules, financial fields locked.
- Cancel paid: `POST /api/bookings/cancel` (server + refund).
- Complete: `POST /api/bookings/complete` → queues `tutorPayouts`.

### Messaging

- `lib/conversations/service.ts`, `ids.ts` (`{studentId}_{tutorId}`), moderation + rate limits.
- UI: `components/conversations/*`, `SendMessageButton` on tutor profile.
- Students start threads; both participants message; blocks/reports exist.

### Reviews

- `POST /api/reviews` — review id **equals** booking id (one review per booking).
- Requires `bookings.status == "completed"`.
- Rating recompute: `POST /api/reviews/recompute-rating` (admin).
- UI: `components/reviews/ReviewModal.tsx` from `StudentBookingsList`.

### Payments (Mercado Pago + Asaas)

Provider-agnostic **gateway** already exists:

- `lib/payments/gateway/types.ts` — `PaymentGateway` interface
- `factory.ts` — `PAYMENT_PROVIDER=asaas|mercadopago` (default `asaas`)
- Implementations: `asaas-gateway.ts`, `mercadopago-gateway.ts`

Live student checkout UI is **Mercado Pago Checkout Bricks**:

- `components/bookings/PayBookingForm.tsx` → `MercadoPagoPaymentBrick.tsx`
- `POST /api/mercadopago/process-payment`
- Webhook: `POST /api/mercadopago/webhook`

Asaas checkout (`POST /api/payments/create-checkout` + `/api/payments/webhook`) still exists and is documented in `README.md`. Abstracted webhook path: `POST /api/payments/webhook` and `/api/payments/webhook/mercadopago` via `process-payment-webhook.ts`.

Fee split is server-authoritative (`lib/payments/money.js`, `PLATFORM_FEE_PERCENT`). Client-submitted prices are ignored.

### Lessons / Jitsi

- Generation: `lib/bookings/meeting.ts` → `https://meet.jit.si/aprendizbay-{bookingId}`
- Safe consume: `parseSafeMeetingUrl` (any `https:` URL, no credentials)
- Lesson view: `lib/lessons/view.ts`, `access.ts`, `status.ts`, `paths.ts`
- UI: `components/lessons/LessonExperience.tsx`, `JoinLessonButton` (external tab)

Meeting URL is written **only on paid confirmation** (webhook / `confirmBookingWithMeetingUrl`).

### Collective hubs

- Create: client `lib/hubs/service.ts#createCollectiveHub` (approved lecturer only; rules enforce)
- Join: server `POST /api/hubs/join`
- Roster: `collectiveHubs/{hubId}/participants/{studentId}` — Admin SDK writes; student/tutor/admin read
- Public occupancy: count only, no roster
- UI: `components/hubs/*`, `TutorCollectiveClasses` on public profile

### Facilitators

- Collections + types: `lib/facilitators/schema.ts`
- Referral cookie: `lib/facilitators/referral-cookie.ts`, landing `app/r/[code]/page.tsx`
- Attach on signup: `POST /api/referrals/attach`, `attach-referral.ts`, anti-fraud
- Commission on **first paid booking**: `lib/facilitators/commission.ts`
- Dashboard API: `GET /api/facilitators/me/dashboard`
- Admin payouts: `/admin/facilitator-payouts` + `app/api/admin/facilitator-payouts/*`

### Admin (do not treat as user dashboard)

`/admin`, `/admin/tutors`, `/admin/payouts`, `/admin/facilitator-payouts`, `/admin/email`, `/admin/contact-inbox`. Metrics via `GET /api/admin/dashboard` (never list `users`/`bookings` from the browser).

### Dual runtime (do not expand)

- **Production:** Vercel + `app/api/**`
- **Legacy:** Express `server/api/*` + committed `hostinger-next/` (deprecated)

CJS mirrors exist (`lib/auth/roles.js`, `lib/bookings/create-booking.js`, `lib/hubs/join-and-book.js`, …) for Express. Dashboard work should use the TypeScript `app/` + `lib/` path.

---

## 2. What is partially implemented

| Area | What works | What is incomplete |
|---|---|---|
| Lecturer dashboard | Availability, hub create, pending/confirmed bookings | No earnings UI, no student roster, no request inbox as a first-class nav item, stacked page not a product shell |
| Student home | Full booking + pay + review list at `/bookings` | Not framed as a student dashboard; no discover/compare shortcuts, no “next lesson” home |
| Role routing | Claims + `normalizeRole()` | Navbar, `RequireAuth roles={["tutor"]}`, and dashboardHref still require exact `"tutor"` |
| Facilitator | Link, cookie, attach, stats, commissions, admin payouts | No navbar entry; page not role-gated; no referred-user list; commissions only hooked in abstracted webhook |
| Payments | Two working providers + gateway interface | Live UI is Mercado Pago Bricks only; Asaas copy still appears (`pagamento=sucesso` messages); three webhook processors |
| Group classroom | Join + per-student booking + pay | Meeting URL is per **booking id**, not per hub — students in the same turma get different Jitsi rooms |
| Search | Filters, tutors, hubs | Navbar search inputs do **not** submit; `/search` vs `/professores` are different products |
| Lecturer profile | Onboarding + settings | `isProfileComplete` is merely “tutor doc exists”; availability and verification are separate |
| Earnings | `tutorPayouts` queued on complete; admin mark-paid | Lecturer cannot see or track payouts in-app |
| Support role | Claim + rules deny financial access | No UI |
| Lesson complete | API + UI button after scheduled time | README still says completion does not exist (stale) |
| Dual turmas URLs | `/turmas/[id]` and `/turmas?id=` both render `CollectiveClassDetail` | Duplicate entry points |

---

## 3. What is missing

Relative to the target product concepts:

1. **`lib/auth/dashboard.ts`** — role → home path, nav items, dashboard shells.
2. **Student dashboard** as a product surface (discover / next class / messages / reviews). `/bookings` is the operational list, not a dashboard.
3. **Lecturer dashboard IA** — profile completeness, requests, students, group classes, earnings as sections rather than a vertical stack of widgets.
4. **Lecturer earnings page** (reads existing `tutorPayouts` / `payments`).
5. **Lecturer student management** — no class roster UI (participants are readable by the hub tutor but unused in UI).
6. **`ClassroomProvider` interface** — Booking → Lesson → provider. Jitsi is hardcoded in `generateMeetingUrl`.
7. **Shared classroom for group lessons** — hub-level meeting URL (or provider session id).
8. **Facilitator nav + referred-user monitoring** (today: aggregate counters only).
9. **Facilitator community/learning activities** (explicitly future).
10. **Navbar search** wiring (home `HeroSearch` works; header `<input type="search">` does not).
11. **Consistent `lecturer` UI gates** (see §5).
12. Pencil Spaces integration (correctly absent).

---

## 4. What is duplicated

| Duplication | Locations | Guidance |
|---|---|---|
| Payment confirmation + Jitsi URL write | `process-webhook.ts` (Asaas), `process-mercadopago-webhook.ts` (MP legacy), `process-payment-webhook.ts` (gateway) | Do not add a fourth. Classroom abstraction should be called from all three or collapsed later — **not during dashboard work** |
| Mercado Pago webhooks | `/api/mercadopago/webhook` vs `/api/payments/webhook/mercadopago` | Live Bricks flow uses the first |
| Checkout | Asaas redirect checkout vs MP Bricks vs `create-mercadopago-checkout.ts` | Live UI is Bricks |
| Express vs Next APIs | `server/api/*` vs `app/api/**` | Vercel is production; do not duplicate new dashboard APIs into Express |
| TS vs CJS | `roles.ts`/`roles.js`, `create-booking.js`, `join-and-book.js`, `complete-lesson.js`, `create-review.js` | Express compatibility; prefer TS |
| Group class pages | `/aulas-coletivas` (marketing), `/turmas` + `/turmas/[id]` (product), hubs inside `/search` | Keep; dashboard should link to `/search` and `/turmas/[id]` |
| Lecturer booking UI | `/tutor/dashboard` and `/bookings` both mount `TutorDashboardBookings` + `TutorConfirmedBookings` | Compose, don’t copy |
| Lesson routes | `/aulas/[bookingId]` and `/aulas?aula=` | Keep both; `lessonPath()` uses the former |
| Tutor vs lecturer naming | Routes `/tutor/*`, collection `tutors`, UI “Professor”, claim `lecturer` | Terminology only — see §5 |

---

## 5. `tutor` versus `lecturer`

**The distinction is only legacy terminology.** There is no separate tutor product.

| Layer | Value |
|---|---|
| Canonical role / custom claim | `lecturer` |
| Signup query + Firestore create | `tutor` (`/signup?role=tutor`) |
| After `sync-signup-role` / `setRole` | Profile rewritten to `lecturer` |
| UI label | Professor |
| Routes, collection, most components | `tutor` (`/tutor/dashboard`, `tutors/{id}`, `tutorId` on bookings) |
| Firestore `isTutor()` | Alias of `isLecturer()` |

**Dashboard-blocking inconsistency:** after professor signup, `setRole("lecturer")` writes `users.role = "lecturer"`, but:

- `app/tutor/dashboard/page.tsx`, `onboarding`, `settings` use `<RequireAuth roles={["tutor"]}>`
- `components/layout/Navbar.tsx` `dashboardHref` is `/tutor/dashboard` only when `role === "tutor"`
- `lib/lessons/paths.ts` `lessonBackLink` only treats `"tutor"` as lecturer

`BookingsPageContent` already uses `isLecturerRole()`, so a `lecturer` profile **can** manage bookings at `/bookings` but is **rejected** from `/tutor/dashboard`.

Do **not** rename collections, routes, or `tutorId` fields in dashboard phases. Normalize at the UI/auth boundary with `isLecturerRole()` / `normalizeRole()`.

---

## 6. How students currently reach their post-login destination

1. Signup (`SignupForm`): `postAuthPathForRole("student")` → **`/bookings`**. Referral cookie attached via `attachReferralAfterSignup`.
2. Login (`LoginForm`): `redirect`/`next` query if present, else `postAuthPathForRole(profile.role)` → **`/bookings`** for anyone who is not `tutor`/`lecturer` (including admin, facilitator, support).
3. Navbar “Meu painel”: `/bookings` unless `role === "admin"` or `role === "tutor"`.
4. There is **no** `/aluno` or `/dashboard` student route.
5. `/bookings` with a student profile renders `StudentBookingsList` (pay, cancel, join lesson, review).

`useRequireAuth` / `RequireAuth` without `roles` only requires a signed-in user.

---

## 7. How lecturers currently reach their dashboard

1. Signup `role=tutor` → `postAuthPathForRole("tutor")` → **`/tutor/onboarding`**.
2. Onboarding: if `useTutorProfile().isProfileComplete` (tutor document exists) → **`/tutor/dashboard`**.
3. Login as tutor/lecturer → `/tutor/onboarding` (then redirect if complete).
4. Navbar: only `role === "tutor"` → `/tutor/dashboard`. Canonical `lecturer` profiles go to `/bookings`.
5. `/tutor/dashboard` is a **stack**: `IncompleteProfileBanner`, `VerificationStatusBanner`, `TutorAvailabilityEditor`, `CreateHubForm`, `TutorDashboardBookings`, `TutorConfirmedBookings`.
6. Emails already deep-link to `/tutor/dashboard`.

---

## 8. How collective classes connect to tutors, students, and bookings

```
tutors/{tutorId}  (must be verified/approved)
        │ createCollectiveHub (client, rules: approved tutor)
        ▼
collectiveHubs/{hubId}
  tutorId, prices, schedule, maxStudents, confirmedStudentCount, status
        │ POST /api/hubs/join (student only)
        ├─► participants/{studentId}     { studentId, joinedAt }
        └─► bookings/{bookingId}
              type: "coletivo"
              hubId, studentId, tutorId
              price = hub.currentPrice (server)
              status: pending → (tutor accept) awaiting_payment → (pay) confirmed
```

- Individual bookings **cannot** be created as `coletivo` via `POST /api/bookings` (`COLLECTIVE_PATH` error).
- Same payment, cancel, complete, review pipeline as individual bookings.
- Hub tutor sees the resulting bookings in pending/confirmed lists; there is **no** hub roster UI.
- Public search lists `status == "open"` hubs and filters by remaining seats.

---

## 9. How facilitators connect to referred users and bookings

```
/r/{code}  → cookie + click increment → /signup
signup     → POST /api/referrals/attach
           → referrals/{userId} { facilitatorId, status, source }
paid booking (first paid only)
           → commissions/booking_{bookingId}
           → facilitator stats.paidBookings
admin      → facilitatorPayouts
```

- Facilitator identity is **`facilitators/{userId}`**, not the custom claim. `GET /api/facilitators/me/dashboard` 403s if that doc is missing; it does **not** require claim `facilitator`.
- Dashboard shows aggregates (clicks, signups, activeUsers, paidBookings, commission amounts) — **not** a list of referred users.
- **Gap:** `maybeCreateFacilitatorCommission` is called only from `lib/payments/process-payment-webhook.ts`. The live Mercado Pago webhook (`process-mercadopago-webhook.ts`) and Asaas `process-webhook.ts` do **not** create commissions. Dashboard work must not “fix” this by rewriting payments; flag it as a payment-follow-up.

---

## 10. How Jitsi is currently connected to lessons

1. Booking is created **without** `meetingUrl`.
2. Lecturer accept sets `paymentStatus: awaiting_payment` only.
3. On **successful payment webhook**, server sets `status: confirmed`, `paymentStatus: paid`, and `meetingUrl = generateMeetingUrl(booking.id)` → `https://meet.jit.si/aprendizbay-{bookingId}`.
4. `LessonExperience` / `JoinLessonButton` show the link when status is confirmed and modality is online.
5. Join is **external** (`target="_blank"`), not an embedded Jitsi iframe.
6. Access: `canAccessLesson` = booking `studentId` or `tutorId` matches viewer. Other hub classmates cannot open another student’s lesson page.

There is no Jitsi JWT, no lobby, no recording, no per-hub room.

---

## 11. Is the classroom integration provider-agnostic enough for Pencil Spaces?

**Consumption: mostly yes. Generation and group semantics: no.**

| Concern | Today | Pencil Spaces later |
|---|---|---|
| Stored field | `bookings.meetingUrl: string` | Can stay; or add `classroomProvider` + `classroomSessionId` beside it |
| Join UI | Any safe `https` URL | Works if Pencil returns https links |
| Generation | Hardcoded Jitsi in `generateMeetingUrl` | **Must** be swapped behind an interface |
| Group class | One URL per booking id | Need hub-level (or provider session) URL shared by all paid participants |
| Dashboards / bookings | Depend only on `meetingUrl` + status | **Do not redesign** if the provider still writes a URL onto the booking |

**Recommended abstraction (smallest, later phase — not this audit):**

```
Booking  →  Lesson  →  ClassroomProvider.createSession(booking | hub)
                JitsiClassroomProvider        (now)
                PencilSpacesClassroomProvider (later)
```

Keep `meetingUrl` as the join contract so `LessonExperience` and emails stay unchanged.

**Do not** introduce Pencil Spaces in dashboard phases.

---

## 12. Code that should NOT be touched during dashboard development

Treat these as frozen unless a dashboard shell needs a **read-only** import:

- `firestore.rules`, `storage.rules`, `firestore.indexes.json`
- `lib/auth/role-server.ts`, `lib/auth/service.ts` (signup writes), custom-claim scripts
- `lib/bookings/create-booking.js`, `cancel-booking.ts`, `complete-lesson.js`, occupancy, `lessonSlots`
- `lib/hubs/join.js`, `join-and-book.js`, `POST /api/hubs/join`
- All of `lib/payments/**` except a future one-line call from webhooks into `ClassroomProvider` (separate phase)
- `app/api/mercadopago/**`, `app/api/payments/**`
- `lib/reviews/create-review.js`, `POST /api/reviews`
- `lib/conversations/**` moderation, rate limits, blocks
- `lib/facilitators/commission.ts`, `anti-fraud.ts`, `attach-referral.ts`
- `lib/firebase/admin.ts`
- `server/api/**`, `hostinger-next/**`, `server.js`
- Admin verification/payout/email APIs
- Mock-tutor production guards (`lib/tutors/mock-gate.ts`)

Dashboard work should **compose** existing pages/components (`StudentBookingsList`, `TutorDashboardBookings`, `ConversationInbox`, `CreateHubForm`, …), not fork them.

---

## 13. Security-sensitive operations that must remain server-authoritative

| Operation | Authoritative path | Client |
|---|---|---|
| Individual booking create + price + slot lock | `POST /api/bookings` | Denied (`allow create: if false`) |
| Collective join + price + occupancy | `POST /api/hubs/join` | Participants `allow write: if false` |
| Paid cancel + refund | `POST /api/bookings/cancel` | Unpaid cancel only via rules |
| Checkout / charge | `/api/mercadopago/process-payment` or `/api/payments/create-checkout` | Client cannot set `price` / fees |
| Payment confirm + `meetingUrl` | Webhooks (Admin SDK) | Cannot set `meetingUrl` on accept (accept may only set `paymentStatus`) |
| Ledger `payments/*`, `tutorPayouts`, commissions, facilitator payouts | Admin SDK | `allow write: if false` |
| Lesson complete + payout queue | `POST /api/bookings/complete` (rules also allow the same transition) | Prefer API |
| Reviews + rating recompute | `POST /api/reviews`, `/api/reviews/recompute-rating` | Client must not write reviews |
| Role / admin / lecturer claim | Admin SDK + `sync-signup-role` | Profile `role` is not trusted for privilege |
| Tutor verification | `POST /api/tutors/review` | Tutors cannot set `isVerified` |
| Account deletion | `POST /api/account/delete` | |
| Occupancy for slot picker | `GET /api/bookings/occupancy` | Never list others’ bookings |
| Facilitator dashboard metrics | `GET /api/facilitators/me/dashboard` | Facilitator reads own `facilitators/{id}` only |
| Admin metrics | `GET /api/admin/dashboard` | |

**Allowed client writes (keep):** tutor profile create/update (non-verification fields), availability, hub create (approved tutor, no roster), conversation/messages (rules + rate limit), lecturer **accept** (`paymentStatus: awaiting_payment` only), unpaid cancel.

Do not move accept behind an API unless a later security phase requires it; dashboard work can keep the existing client accept.

---

## Product-concept mapping (what to add vs reuse)

### STUDENT — discover → compare → contact → request/book → pay → attend → review

| Step | Exists? | Reuse |
|---|---|---|
| Discover | Yes | `/`, `HeroSearch`, `/search`, `SearchResults` |
| Compare | Yes | `TutorCard`, `/tutor/[id]`, `components/tutor/*` |
| Contact | Yes | `SendMessageButton`, `/mensagens` |
| Request/book | Yes | `BookingWidget`, `POST /api/bookings` |
| Pay | Yes | `PayBookingForm`, Mercado Pago Bricks |
| Attend | Yes | `/aulas/[bookingId]`, `JoinLessonButton` |
| Review | Yes | `ReviewModal`, `POST /api/reviews` |
| **Dashboard home** | **No** | Compose `StudentBookingsList` + links to search/messages |

Post-login should eventually be a student dashboard **or** remain `/bookings` with a thin shell. Do not replace `StudentBookingsList`.

### LECTURER — profile → subjects/prices/availability → requests → teach → students → earnings

| Step | Exists? | Reuse |
|---|---|---|
| Create profile | Yes | `/tutor/onboarding`, `TutorOnboardingWizard` |
| Subjects/prices | Yes | wizard + `/tutor/settings` |
| Availability | Yes | `TutorAvailabilityEditor`, `lib/availability/service.ts` |
| Receive requests | Yes | `TutorDashboardBookings` (`confirmBookingAsTutor`) |
| Teach individual/group | Yes | lessons + `CreateHubForm` |
| Manage students | Partial | confirmed bookings; add roster later from `participants` |
| Earnings | Backend only | `tutorPayouts` + admin; **add read-only lecturer view** |
| **Dashboard shell** | Partial | Keep `/tutor/dashboard`; section it; accept `lecturer` |

### FACILITATOR — link → acquire → monitor → commissions → community

| Step | Exists? | Reuse |
|---|---|---|
| Referral link | Yes | `/r/[code]`, `/facilitador` copy-link |
| Acquire students | Yes | cookie + `attach-referral` |
| Monitor referred users | Aggregates only | `lib/facilitators/dashboard.ts` |
| Commissions | Partial (wrong webhook hook) | Do not rebuild; payment follow-up |
| Community | No | Out of scope for early dashboard phases |
| **Nav** | Missing | Link `/facilitador`; do not send facilitators to `/bookings` as “home” |

### GROUP LEARNING — discover → places → join → pay → shared classroom → review

| Step | Exists? | Gap |
|---|---|---|
| Discover | Yes | `/search` hubs, `/turmas/[id]`, profile hubs |
| Places | Yes | `confirmedStudentCount` / `maxStudents` |
| Join | Yes | `POST /api/hubs/join` |
| Pay | Yes | Same booking payment |
| Shared classroom | **No** | Per-booking Jitsi URL |
| Review lecturer | Yes | Per-booking review |

### CLASSROOM — Booking → Lesson → ClassroomProvider → Jitsi now → Pencil later

| Layer | Exists? |
|---|---|
| Booking | Yes |
| Lesson | Yes (`lib/lessons/*`, `/aulas/*`) |
| ClassroomProvider | **No** |
| Jitsi | Yes, hardcoded generator |
| Pencil Spaces | No |

---

## Smallest set of changes to establish the product concepts

Do these **before** (or as the first slice of) dashboard implementation. Nothing below rebuilds payments, bookings, messaging, hubs, or rules.

1. **Role-aware dashboard router** (new `lib/auth/dashboard.ts`)
   - `student` → student home (`/bookings` until a shell exists)
   - `lecturer` **and** `tutor` → `/tutor/onboarding` or `/tutor/dashboard`
   - `facilitator` → `/facilitador` (if they also have a student profile, keep `/bookings` as secondary)
   - `admin` → `/admin`
   - Use `isLecturerRole()` everywhere `role === "tutor"` is used for UI gates: `Navbar`, `RequireAuth` on tutor pages, `lessonBackLink`, pending-booking badge.

2. **Do not rename** `/tutor/*`, `tutors` collection, or `tutorId`. Document `tutor` as a stable identifier alias.

3. **Student dashboard = shell around existing lists**, not a new booking system.

4. **Lecturer dashboard = section the existing page** (requests, classes, availability, hubs) and add a **read-only earnings** panel from `tutorPayouts`.

5. **Facilitator** = wire nav + reuse `/facilitador`. Do not add community features yet. Do not “fix” commission webhooks in the dashboard PR.

6. **ClassroomProvider** = extract `generateMeetingUrl` behind an interface; keep storing `meetingUrl` on the booking. Shared hub URL is a **classroom** phase, not a dashboard phase, but the interface should accept `{ bookingId, hubId? }` so group rooms can be added without touching dashboards.

7. Navbar search: one-line submit to `/search?q=` — marketplace polish, optional with dashboards.

---

## Known gaps that are **not** dashboard work

- Facilitator commission not created on live Mercado Pago / Asaas webhook processors.
- Dual payment stacks (Bricks vs gateway vs Asaas).
- Group classes do not share a classroom.
- README claims lesson completion is missing (outdated).
- Hostinger Express subset vs Vercel.
- `support` role has no product surface.

---

### Recommended implementation order

Phases below assume **reuse, not rewrite**. Each phase lists the existing files to keep as the source of truth.

#### Phase 0 — this audit (complete)

Deliverable: this document. No product code.

#### Phase 1 — Role + destination alignment (prerequisite)

**Why first:** lecturer dashboards are currently gated on legacy `"tutor"` while signup sync writes `"lecturer"`. Facilitators and admins are sent to `/bookings`.

Reuse:

- `lib/auth/roles.ts` (`isLecturerRole`, `normalizeRole`)
- `lib/auth/redirects.ts` (extend or replace with `lib/auth/dashboard.ts`)
- `lib/auth/useRequireAuth.ts` / `components/auth/RequireAuth.tsx`
- `components/layout/Navbar.tsx`
- `lib/lessons/paths.ts`
- `components/bookings/BookingsPageContent.tsx` (already correct)

Touch: tutor pages’ `roles={["tutor"]}` → allow `tutor` **and** `lecturer`. Tests: `lib/auth/redirects.test.ts`, `BookingsPageContent.test.tsx`.

**Do not touch:** `role-server.ts` claim issuance, Firestore rules.

#### Phase 2 — Lecturer dashboard shell (no new backend)

Reuse as sections of `/tutor/dashboard` (or a thin layout):

- `IncompleteProfileBanner`, `VerificationStatusBanner`
- `TutorAvailabilityEditor` + `lib/availability/service.ts`
- `CreateHubForm` + `lib/hubs/service.ts`
- `TutorDashboardBookings`, `TutorConfirmedBookings`
- Settings remain `/tutor/settings` + `TutorProfileSettings`
- Onboarding remains `/tutor/onboarding` + `TutorOnboardingWizard`

Add: information architecture (nav within the lecturer area), empty states, link to public `/tutor/{id}`. Optional read-only earnings list from `tutorPayouts` via a **new read API** that only returns the signed-in lecturer’s payouts (do not let the client query all `tutorPayouts`; rules already restrict reads to owner/admin).

**Do not touch:** accept/cancel/complete implementations, hub join, verification APIs.

#### Phase 3 — Student dashboard shell (no new backend)

Reuse:

- `StudentBookingsList` (pay, cancel, review, join)
- `ConversationInbox` / link to `/mensagens`
- `PayBookingForm` unchanged
- Lesson links via `lessonPath()` → `/aulas/[bookingId]`
- Discover CTA → existing `/search`

Post-login: keep `/bookings` **or** add `/aluno` that renders the same list plus next-lesson and search. Prefer wrapping `/bookings` to avoid a third bookings surface.

**Do not touch:** `POST /api/bookings`, payment Bricks, reviews API.

#### Phase 4 — Facilitator dashboard productization

Reuse:

- `app/facilitador/page.tsx`
- `lib/facilitators/client.ts`, `dashboard.ts`
- `GET /api/facilitators/me/dashboard`
- `/r/[code]`, referral cookie, attach-on-signup

Add: navbar destination; optional `RequireAuth` once claim **or** facilitator record is confirmed (API already 403s). Referred-user table only if a **new server endpoint** projects safe fields from `referrals` (never emails in the client query).

**Do not touch:** `commission.ts`, anti-fraud, payout approve/mark-paid, payment webhooks. Commission-webhook hookup is a **payments** follow-up, not this phase.

#### Phase 5 — Marketplace navigation polish (optional with dashboards)

Reuse: `HeroSearch`, `SearchResults`, `SearchFilters`, `TutorCard`, `CollectiveClassCard`, `/turmas/[id]`.

Add: navbar search submit → `/search`. Do not merge `/professores` SEO pages into `/search`.

#### Phase 6 — ClassroomProvider (Jitsi now, Pencil later)

Reuse:

- `lib/bookings/meeting.ts` (`parseSafeMeetingUrl` stays)
- `lib/lessons/view.ts`, `JoinLessonButton`, `LessonExperience`
- Webhook writers that set `meetingUrl`

Add: `lib/classroom/types.ts` + `JitsiClassroomProvider` wrapping `generateMeetingUrl`. Call it from the existing webhook writers **without** changing booking state machine. Extend input with `hubId` so Phase 7 can share a room.

**Do not** add Pencil Spaces, embeds, or JWT here. **Do not** redesign `/aulas` or dashboards.

#### Phase 7 — Shared group classroom

Reuse: `collectiveHubs`, `join-and-book.js`, bookings `type: "coletivo"`, `hubId`.

Add: store one classroom URL (or session id) on the **hub** (or deterministic id from `hubId`), copy onto each confirmed collective booking. Lesson UI already joins `booking.meetingUrl`.

**Do not** change join/pay/review. Still Jitsi.

#### Phase 8 — Lecturer students + earnings (if not done in Phase 2)

Reuse: `participants` reads (already allowed for hub tutor), `TutorConfirmedBookings`, `lib/payments/tutor-payouts.ts`, admin payout pages as the operational source of truth.

Add: roster UI; lecturer earnings from owner-scoped API.

#### Phase 9 — Pencil Spaces (future, out of current program)

Implement `PencilSpacesClassroomProvider`. Swap factory. Keep Booking → Lesson → `meetingUrl` (or https join link). No dashboard or booking redesign.

#### Explicitly deferred / never in dashboard phases

- Replacing Mercado Pago or Asaas
- Collapsing the three webhook processors
- Renaming `tutors` / `/tutor` to `lecturer`
- Rebuilding messaging, reviews, or hub join
- Facilitator community
- Support-role UI
- Hostinger Express parity for new dashboard APIs
- Loosening Firestore rules

---

## Appendix A — API map (`app/api`, production)

Auth: `auth/sync-signup-role`
Bookings: `bookings`, `bookings/cancel`, `bookings/complete`, `bookings/occupancy`
Hubs: `hubs/join`
Reviews: `reviews`, `reviews/recompute-rating`
Payments: `mercadopago/process-payment`, `mercadopago/webhook`, `payments/create-checkout`, `payments/webhook`, `payments/webhook/mercadopago`, `payments/refund`
Tutors: `tutors/review`, `tutors/resubmit`
Facilitators: `facilitators/me/dashboard`, `referrals/track-click`, `referrals/attach`
Users: `users/public-profile/[uid]`, `account/delete`
Admin: `admin/dashboard`, `admin/tutor-payouts`, `admin/facilitator-payouts/*`, `admin/email-outbox`, `admin/email-diagnostics`, `admin/contact-inbox`, `admin/jetsend/sending-domains`
Other: `notifications`, `notifications/reminders`, `webhooks/jetsend`, `contact`, `public-config`

## Appendix B — Inspected paths (requested)

| Requested | Status |
|---|---|
| `lib/auth/roles.ts` | Exists; canonical model |
| `lib/auth/dashboard.ts` | **Missing** — use `lib/auth/redirects.ts` today |
| `app/tutor/dashboard` | Exists; widget stack; `roles={["tutor"]}` |
| `app/tutor/onboarding` | Exists; wizard |
| `app/search` + `components/search/*` + `lib/tutors/*` | Exists; primary marketplace |
| `app/bookings` + `components/bookings/*` | Exists; student home + lecturer workspace |
| `app/mensagens` | Exists |
| `app/aulas/*` | Exists; lesson experience |
| `lib/hubs/*` + `app/turmas/*` + `app/aulas-coletivas` | Hubs product + marketing page |
| `app/facilitador` + `lib/facilitators/*` | Exists; not in nav |
| `app/api/*` | Full marketplace APIs (see Appendix A) |
| Firestore rules | Comprehensive; do not loosen |
| Lesson/Jitsi | `lib/bookings/meeting.ts` + lessons UI |
| Mercado Pago | Bricks live path + gateway abstraction + duplicate webhooks |
