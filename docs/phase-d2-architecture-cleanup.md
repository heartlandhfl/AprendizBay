# Phase D.2 — Architecture Cleanup

Read-only investigation + minimal consolidation. No product behavior changes intended.

## Production runtime

| Environment | API handler | Payment webhooks |
|-------------|-------------|------------------|
| **Vercel** (production) | `app/api/**` Next.js routes | Live |
| **Hostinger** (deprecated) | `server/api/**` Express subset | Not mounted — returns 404 |
| **Local dev** | Express first, then Next for unmatched `/api/*` | Next.js routes |

Express routers in `server/api/index.js` are **required** for Hostinger and must not be deleted because Next.js equivalents exist.

## Payments — canonical paths

| Flow | Canonical route | Processor |
|------|-----------------|-----------|
| Asaas webhook | `POST /api/payments/webhook` | `lib/payments/process-webhook.ts` |
| Mercado Pago webhook | `POST /api/payments/webhook/mercadopago` | `lib/payments/process-payment-webhook.ts` |
| MP webhook (legacy alias) | `POST /api/mercadopago/webhook` | Same handler via `handle-mercadopago-webhook.ts` |
| MP Bricks charge | `POST /api/mercadopago/process-payment` | `process-mercadopago-payment.ts` |

### Removed (proven unused)

- `lib/payments/process-mercadopago-webhook.ts` — no route imported it; superseded by unified `process-payment-webhook.ts`
- `lib/payments/process-mercadopago-webhook.test.ts`
- `lib/bookings/server.ts` → `confirmBookingWithMeetingUrl()` — zero callers; webhooks are the only confirmation writers

`mercadopagoWebhookReceipts` Firestore collection rules remain for historical receipts.

## Classroom — canonical abstraction

```
Booking → ClassroomProvider → JitsiProvider
```

| Module | Role |
|--------|------|
| `lib/classroom/types.ts` | `ClassroomProvider` interface |
| `lib/classroom/jitsi-provider.ts` | Jitsi implementation (`meeting-server` HMAC) |
| `lib/classroom/index.ts` | `resolveClassroomJoinUrl()` — used by payment webhooks |

Client UI continues to read `bookings.meetingUrl` from Firestore and validate via `parseSafeMeetingUrl` in `lib/bookings/meeting.ts`.

Pencil Spaces is not implemented; the provider interface is ready for a future provider.

## Group learning — page roles (unchanged)

| Route | Role |
|-------|------|
| `/aulas-coletivas` | Marketing / SEO |
| `/search`, `/tutor/[id]#turmas` | Discovery |
| `/turmas/[id]` | Product — join & pay |
| `/turmas?id=` | Legacy alias → redirects to `/turmas/[id]` |

## Bookings — canonical surfaces (unchanged)

| Route | Role |
|-------|------|
| `/dashboard` | Student summary |
| `/bookings` | Manage reservations (pay, cancel, review) |
| `/aulas/[bookingId]` | Lesson room (join meeting) |

Data model: `Booking` (client) + `BookingRecord` (server) over one Firestore `bookings` collection.

## Observability

`lib/observability/server-log.ts` → `logCriticalServerFailure(area, message, context)` for:

- payment / webhook verification and amount mismatch
- facilitator commission failures
- review API failures

Logs are structured server-side only; API responses remain user-safe generic messages.
