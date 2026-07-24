# Altus Performance — Security & Encryption Posture
*Working reference for client due-diligence questionnaires and internal review.*
*Last updated July 2026.*

## Encryption

**At rest.** All platform data is stored on Supabase managed PostgreSQL
(AWS eu-west-1, Ireland). Supabase encrypts all database storage, backups,
and file storage at rest using AES-256. This is provided at the
infrastructure level on every project — there is no unencrypted storage
tier in use.

**In transit.** All connections — browser ↔ platform, platform ↔ database,
platform ↔ third-party services — are encrypted with TLS 1.2+. The
application enforces HTTPS via HSTS (`Strict-Transport-Security` with
preload, set in `next.config.ts`). Plain-HTTP access is not served.

**Credentials.** User passwords are handled exclusively by Supabase Auth
and stored as bcrypt hashes. The application never stores, logs, or
transmits plaintext passwords. HP module access codes are verified
server-side; sessions use signed httpOnly cookies (HMAC, server-side
secret). Gym check-in QR tokens are HMAC-signed and cannot be forged
without the server secret.

## Access control (the layer that matters most)

Encryption protects against infrastructure compromise; **row-level
security (RLS) protects against the far more common failure** — one
user's credentials reaching another user's data.

- Every application table has RLS enabled with role-scoped policies
  (`supabase-security-setup.sql`, `supabase-release-security.sql`,
  `supabase-security-hardening.sql` — run all three on any new environment).
- Coaches are scoped to their assigned teams; heads of sport and the
  owner have wider scopes via SQL helper functions
  (`current_staff_role()`, `is_hoh_or_owner()`, `can_access_team()`).
- Children's data linking tables (`player_profiles`) and audit logs are
  locked to server-API access only — no browser client can query them,
  even with valid credentials.
- Privileged operations run through API routes using the service-role
  key, which exists only as a server-side environment variable and is
  never shipped to the browser.
- Sensitive HP records carry an append-only audit log (who changed what,
  when, previous value).

## Application-level protections

- Role checks on privileged API routes (`authenticateRequest`), verified
  against the `staff_roles` table with the caller's own JWT.
- Rate limiting on authentication, upload, and AI endpoints
  (Redis-backed when `UPSTASH_REDIS_REST_*` is configured; in-memory
  fallback otherwise).
- Security headers: CSP, HSTS (preload), `X-Frame-Options: SAMEORIGIN`,
  `X-Content-Type-Options: nosniff`, restrictive `Permissions-Policy`
  (camera limited to self for QR check-in; microphone, geolocation,
  payment disabled).
- CI gate runs type checks, lint, and unit tests on every push.

## Data residency & POPIA

Data is hosted in the EU (Ireland). This is a cross-border transfer under
POPIA s.72, covered by the adequacy of GDPR-governed jurisdictions and
processing agreements with Supabase and Vercel. Altus acts as operator
for school-entered athlete data (the school is the responsible party) and
as responsible party for direct-user account data — see the Privacy
Policy for the full role breakdown.

## Operational checklist (owner actions, not code)

| Item | Status | Where |
|---|---|---|
| Run `supabase-security-hardening.sql` | ☐ once per environment | Supabase SQL editor |
| MFA on the Supabase dashboard account | ☐ recommended | Supabase account settings |
| MFA on the Vercel account | ☐ recommended | Vercel account settings |
| Leaked-password protection | ☐ recommended | Supabase Auth settings |
| Point-in-time recovery / daily backups | ☐ verify plan tier | Supabase database settings |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` for distributed rate limiting | ☐ optional at pilot scale | Vercel env vars |
| Periodic review of `staff_roles` (remove departed staff) | ☐ recurring | App / Supabase |

## Honest limitations

- Column-level encryption (encrypting individual fields inside the
  database) is **not** in use; protection relies on full-disk AES-256 at
  rest plus RLS. This is the standard posture for this class of platform;
  field-level encryption can be added for specific columns if a client
  contract requires it.
- The service-role key grants full data access by design. It lives only
  in Vercel's encrypted environment variables; rotating it after any
  suspected exposure is a one-minute operation in Supabase settings.
- Security of a school's data also depends on the school's own account
  hygiene (strong passwords, prompt removal of departed staff) — worth a
  line in the licence agreement.
