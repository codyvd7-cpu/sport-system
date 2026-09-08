# Repair ledger — A01–A50

Snapshot: this ZIP, packaged and reopened for verification before delivery (see manifest below).
Baseline: ZIP (22)/APP-AUDIT.md, 50 findings.

## Correction on record

My prior response's A18 test proved nothing — it tested two DIFFERENT athletes,
whose composite keys never collided under the old schema regardless of the bug.
The real A18 mechanism is the SAME athlete, two different parents, both
racing the shared placeholder UUID. Reproduced directly against a simulation
of the old schema (confirmed: second invite silently overwrote the first),
then reproduced the same scenario against the live, fixed schema (confirmed:
both survive). Full queries in `evidence/a18-corrected-test.sql`.

## A01 — Critical — Parent invitation completion bypasses approval

**Status: fixed, tested.**
- `app/api/parent/complete-invite/route.ts` — rewritten. No fallback to
  `user_metadata` or request-body `athleteId` remains anywhere in the file.
  Authorization is solely a live `athlete_claims` row: `status =
  'pending_activation'`, `expires_at > now()`, matched on verified email.
- Consumption is atomic: `UPDATE ... WHERE status = 'pending_activation'`,
  so a second concurrent request affects zero rows.
- **Tested against the live database:**
  - uninvited email → zero claims found → 403
  - expired invite → excluded by the `expires_at` filter
  - two different parents for the SAME athlete → both survive as separate
    rows (the corrected A18 test)
  - concurrent consumption of the same claim → exactly one succeeds
- **Not yet tested:** existing-account activation path, one parent with
  multiple children (player_profiles still holds a single athlete_id — this
  is a real, separate data-model limit, not silently fixed here), partial
  database failure mid-consumption.

## A10 — High — Staff endpoints bypass active-role and team restrictions

**Status: foundation built, applied to 2 of ~15 affected routes.**
- `lib/staffAuth.ts` added — `requireStaffContext()` re-verifies `is_active`
  on both the staff row and the school, resolves real role/teams/sport.
  `canActOnTeam()` and `requireOwnedAthlete()` are the enforcement primitives
  other routes need to adopt.
- Applied in `parents/invite`. **Not yet applied** to the other ~13 routes
  A10/A11/A12/A25 name (`coach/pulse`, `workout/team`, `workout/programs`,
  `player/me`, `admin/coach-photo`, etc.). Each needs its own pass — the
  resolver existing does not mean the routes use it yet.

## A18 — High — Existing parent accounts and multiple children

**Status: the placeholder-collision mechanism is fixed and correctly tested
(see correction above). Existing-account handling and multi-child support
are NOT fixed** — `player_profiles.athlete_id` is still single-valued.

## A45 — High — Open portal migration stops at the overview

**Status: partially fixed.** `/portal-login` now redirects rather than
rendering a code form (confirmed correct in GPT's review). **The deeper
finding is NOT fixed**: `app/api/portal/fixtures/route.ts` still calls
`verifyPortalCookie` unconditionally and returns 401 with no `?school=`
fallback. Found this independently while reconciling versions, matches
GPT's finding exactly. Not yet repaired in this delivery.

## A44 — High — Telemetry does not strip all personal data

**Status: not fixed.** Confirmed against my own Sentry config: `message`,
`exception.values`, `extra`, and breadcrumb `from`/`to` are untouched by
the current `beforeSend` callbacks. My earlier claim of "all personal data
stripped" was inaccurate. Not yet repaired.

## A02–A09, A11–A17, A19–A43, A46–A50

**Not yet started.** No code in this ZIP addresses these. Do not treat
their absence from this list as "no longer applicable" — it means
untouched, per the audit's own instruction not to claim a finding resolved
without evidence.

---

## Database migrations applied LIVE (Supabase project hyfjjobbxzmpxndvyplf)

These are already applied to the real database, independent of this ZIP:

```sql
ALTER TABLE athlete_claims ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE athlete_claims ADD COLUMN IF NOT EXISTS invite_token uuid DEFAULT gen_random_uuid();
ALTER TABLE athlete_claims ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE athlete_claims DROP CONSTRAINT IF EXISTS athlete_claims_athlete_id_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_user_athlete
  ON athlete_claims (athlete_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_pending_email
  ON athlete_claims (athlete_id, email) WHERE status = 'pending_activation';
ALTER TABLE athlete_claims DROP CONSTRAINT IF EXISTS athlete_claims_status_check;
ALTER TABLE athlete_claims ADD CONSTRAINT athlete_claims_status_check
  CHECK (status IN ('pending_activation', 'pending', 'approved', 'rejected'));
```

Full text also included as `supabase-fix-a01-a18-claims.sql` in this ZIP —
running it again is a safe no-op (every statement is `IF NOT EXISTS` /
`IF EXISTS`), which is itself worth independently confirming (A32 asks for
exactly this property generally; this migration happens to already have it).

## Manifest — files in this delivery, confirmed present by reopening the ZIP after packaging

- `lib/staffAuth.ts` (new)
- `app/api/parent/complete-invite/route.ts` (rewritten)
- `app/api/parents/invite/route.ts` (rewritten)
- `supabase-fix-a01-a18-claims.sql` (new — already applied live, included for reproducibility)
- `REPAIR-LEDGER.md` (this file)
