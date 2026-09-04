# Phase C.3 — Group classroom model (future)

## Current architecture

Collective learning today uses:

- `collectiveHubs/{hubId}` — turma metadata, capacity, price, schedule
- `collectiveHubs/{hubId}/participants/{studentId}` — roster (Admin SDK only)
- `bookings/{bookingId}` with `type: "coletivo"` and `hubId` — per-student payment record
- Meeting URLs are generated per booking after payment (same Jitsi path as individual lessons)

## Target model (not implemented in C.3)

```
Collective Hub → shared session/classroom → participants
```

One classroom per hub/session instead of one Jitsi room per paid booking.

## Why C.3 did not redesign this

- Payment webhooks and `generateMeetingUrl(bookingId)` are wired to booking documents.
- Changing to hub-scoped classrooms touches payment confirmation, lesson entry (`JoinLessonButton`), and tutor/student lesson pages.
- C.3 hardened occupancy release on cancel and kept the existing join/payment APIs.

## Recommended follow-up

1. Add `meetingUrl` (or `sessionId`) on `collectiveHubs` when the first paid participant confirms or when the tutor opens the session.
2. Gate classroom entry on hub membership + paid booking (or hub-level payment flag).
3. Migrate `JoinLessonButton` for `coletivo` bookings to resolve the hub session URL.
4. Deprecate per-booking Jitsi URLs for collective lessons once hub sessions are stable.
