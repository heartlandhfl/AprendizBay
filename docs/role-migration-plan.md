# Role & Authorization Migration Plan

## Current state (before migration)

| Layer | Mechanism |
|---|---|
| Firestore `users/{uid}.role` | `student`, `tutor` (professor), `admin` |
| Firebase Auth custom claims | Not used |
| Facilitator program | Separate `facilitators/{uid}` collection (not a user role) |
| Support | Email inbox only (`SUPPORT_CONTACT_EMAIL`), not a user role |

## Target state

| Layer | Mechanism |
|---|---|
| **Authoritative (privileged)** | Firebase Auth custom claim `{ role }` |
| **Profile metadata** | Firestore `users/{uid}.role` synced by Admin SDK |
| **Canonical roles** | `student`, `lecturer`, `admin`, `facilitator`, `support` |
| **Legacy alias** | Profile `tutor` ≡ `lecturer` (signup path unchanged) |
| **UI label** | `lecturer` / `tutor` → **Professor** (Portuguese) |

## What changes

1. **Admin access** — requires `request.auth.token.role == "admin"`. Editing `users/{uid}.role` to `admin` no longer grants admin panel or admin API access.
2. **Professor access** — `lecturer` custom claim (set automatically after professor signup via `POST /api/auth/sync-signup-role`). Profile `tutor` remains accepted in rules until all accounts are migrated.
3. **Facilitator / support** — new privileged roles via `scripts/manage-role.ts` or `setRole()`.
4. **Student self-registration** — unchanged (`role: "student"` profile create).

## Non-destructive migration steps

Run in order on each Firebase project (staging, then production):

### 1. Deploy application code + rules

Deploy the updated app and Firestore/Storage rules. Admin users without claims will lose admin access until step 2.

### 2. Bootstrap first admin

```bash
ADMIN_EMAIL=you@example.com npx tsx scripts/bootstrap-admin.ts
```

The user must already exist in Firebase Authentication (sign up normally first).

### 3. Migrate existing privileged profiles

```bash
npx tsx scripts/migrate-role-claims.ts --dry-run
npx tsx scripts/migrate-role-claims.ts
```

This sets custom claims for existing `admin`, `tutor`/`lecturer`, `facilitator`, and `support` profile roles.

### 4. Verify

- Admin can access `/admin` and admin APIs.
- Professor (`tutor` profile) can access tutor dashboard and create tutor profile.
- Student cannot escalate by editing `users/{uid}`.
- Run `npm run test:rules`.

### 5. (Future) Remove professor profile fallback

Once all professor accounts have `lecturer` claims and signup sync is confirmed in production, remove the profile `tutor`/`lecturer` fallback from `isLecturer()` in `firestore.rules` and `storage.rules`.

## Creating test users

See README section **Test user roles** (updated in this PR).

## Rollback

1. Redeploy previous Firestore rules (profile-based admin).
2. Custom claims are harmless if unused by old rules.
3. No Firestore data is deleted by this migration.
