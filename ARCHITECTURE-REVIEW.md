# Altus Performance — Architecture Review
*Senior engineering audit · July 2026 · 168 TS/TSX files · ~25,800 lines*

---

## 1. Executive summary

The platform works and ships fast — that's worth protecting. But it has grown by
accretion: three parallel implementations of the same alerting feature (one of
which is **silently broken in two ways**), 22 separate hand-rolled Supabase
admin clients, four different authentication patterns across 35 API routes,
God-components up to 1,539 lines, and a legacy player-access stack still live
alongside its replacement. None of this is visible to users today; all of it
taxes every future change and will bite hardest exactly when the product
succeeds (more schools, more sports, more hands in the code).

**Priority order: fix the split-brain alert defect (P0), consolidate the
server-side foundations (P1 — done in this batch), then dismantle duplication
and God-components incrementally (P2), then platform hardening (P3).**

---

## 2. System map

### 2.1 Surfaces
| Surface | Route space | Auth | Users |
|---|---|---|---|
| Staff app | `/dashboard`, `/athletes`, `/attendance`, `/teams`, … | Supabase Auth + `staff_roles` (AuthGuard) | Coaches, HoS, owner |
| HP module | `/hp/*` | Signed `hp_session` cookie (access code) | HP coaches |
| Public portal | `/portal*` | Per-sport access code → `portal_session` + `portal_sport` cookies | Parents |
| Player app | `/player/*` | Supabase Auth (player accounts) | Athletes/parents |
| Portal admin | `/portal-admin` | Supabase Auth + role check | HoS per sport |
| Emergency | `/lightning` | Supabase Auth, owner + head_of_sport | Duty staff |

### 2.2 Data flow patterns (as-built)
Three coexisting patterns:

1. **Browser → Supabase directly** (28 pages import the anon client).
   Works for staff pages because staff RLS policies allow it. It *silently
   returned nothing* for player pages until `/api/player/me` was added —
   evidence that this pattern is a standing trap: whether a page works depends
   on invisible RLS state, and failures manifest as empty UI, not errors.
2. **Browser → API route → service-role client** (player app, HP module,
   alerts, check-ins). The right pattern for cross-tenant reads and
   privileged writes; implemented 22 times with copy-pasted client creation
   and 3 different JWT-verification helpers.
3. **Browser → API route → external service** (weather → Open-Meteo,
   AI report → Anthropic, push → web-push).

### 2.3 Domain map
- **HP**: `hp_students`, `hp_test_results`, `hp_attendance`, `hp_audit_log` —
  the healthiest domain: repository layer (`hpRepository`), analytics library
  (`hpAnalytics`), shared test definitions (`hpTests`), atomic upserts + audit.
  This is the pattern the rest of the codebase should converge on.
- **Portal**: `portal_fixtures`, `portal_results`, `portal_reminders`,
  `portal_week_plans(+items)`, `portal_programs`, `portal_sponsors`.
- **Players**: `player_profiles` (bridges auth user → `athletes` →
  `hp_students`), `gym_checkins`, `push_subscriptions`.
- **Staff**: `athletes`, `attendance`, `performance_tests`, `coach_notes`,
  `staff_roles`.

---

## 3. Findings, ranked

### P0 — Defects hiding in duplicated architecture

**F1. Split-brain safety alerts.** Two live trigger systems write to
*different tables* while one banner reads only one of them:
- `/lightning` → `/api/alerts` → **`urgent_alerts`** ← polled by the banner ✅
- Portal-admin *SafetySection* → `/api/safety-alert` → **`safety_alerts`** ← read by nothing that renders ❌

Net effect: a head of sport activating the alert from portal-admin sees
"A banner is showing on the portal right now" — **and no banner shows
anywhere**. For a safety feature this is the worst failure mode: false
confidence.

**F2. Push column mismatch.** `/api/safety-alert` sends web-push reading
`sub.auth_key`; both subscribe routes store the column as `auth`. Every push
attempted through that route fails (caught, counted as "failed", surfaced as
a number nobody interprets). Combined with F1: the portal-admin safety flow
does nothing visible *and* notifies nobody.

**F3. Triple alert/notification stacks.** Beyond F1's two:
`NotificationBell` → `/api/notifications/subscribe|send` is a third,
independent push pipeline. Three subscribe flows, two broadcast
implementations, two schema conventions. Every future notification feature
must guess which stack to extend.

*Fix (this batch):* one `alertsService` on `urgent_alerts`; **both** endpoints
become thin adapters preserving their existing response contracts, broadcast
through the one shared, correct push helper. `notifications/*` is Phase 2
(its UI contract needs verification before touching).

### P1 — Foundation duplication (fixed in this batch)

**F4. 22 inline service-role clients.** Every API route constructs its own
`createClient(url, SERVICE_ROLE_KEY)` with its own missing-env handling (some
500, some silently degrade). One memoized factory removes ~80 lines of
boilerplate and makes misconfiguration behave one way.

**F5. Four auth patterns across 35 routes.** `verifyHpCookie` (9 routes),
inline `auth.getUser` Bearer parsing (4 variants), `authenticateRequest`
(13), and nothing (public). The player-app Bearer flow alone is implemented
three times with three error shapes. Extracted to `lib/playerAuth.ts`.

**F6. Inconsistent authorization policy.** Owner's stated policy: lightning
is owner + head_of_sport only. `/api/alerts` enforces that; `/api/safety-alert`
allowed `deputy_head_of_sport`, `mic`, and `coach`. Unified to the stated
policy (this is the one deliberate behavior alignment in this batch, flagged
because policy drift across duplicate endpoints is exactly how access-control
holes happen).

### P2 — Structural debt (roadmap)

**F7. God components.** `portal-admin/page.tsx` **1,539 lines** holding state
for 8 domains + 40 props drilled into section components; `athletes/[id]`
1,033; `player/profile` 951; `dashboard` 817. Symptoms already observed in
this project's history: prop-name mismatches surfacing as build failures,
edits colliding, every feature touching the same file.
*Strategy:* per-domain hooks (`useFixturesAdmin()`, `useRemindersAdmin()`…)
co-located with each section; page becomes a thin tab shell. Mechanical,
low-risk, one domain at a time.

**F8. Legacy player stack still live.** `/player/[code]` (498 lines) +
`api/player/check|lookup|profile|upload-photo` predate the authed player app
and duplicate its data assembly with different field conventions. Dead weight
+ a second privacy surface (code-based access to athlete data).
*Strategy:* confirm no inbound links/QRs reference `/player/[code]`, then
delete the stack in one PR.

**F9. Client-side duplicated utilities.** `fTime` ×5, date formatting ×15
files, `outcome()` ×3, session+Bearer fetch boilerplate ×6. Each copy can
drift (the tier-direction bug fixed earlier this month was exactly this class
of failure). *Strategy:* `lib/format.ts` + a tiny `playerApi()` client;
migrate call sites opportunistically with any touched file.

**F10. Type truth lives in N places.** `Fixture` was defined twice and the
copies diverged (caused a real build break). Portal row types are re-declared
ad hoc as `Row = Record<string, any>` in most pages, so column renames are
invisible until runtime. *Strategy:* one `lib/types/` module per domain;
consider generated Supabase types as the source.

### P3 — Platform & process

**F11. In-memory state on serverless.** `rateLimit` and the weather cache are
per-instance Maps: limits reset on cold start and don't apply across
concurrent instances; weather re-fetches per instance. Fine at pilot scale —
document the ceiling; move to Upstash/Redis or DB-backed limits before
multi-school scale.

**F12. Polling everywhere.** Banner (45s), notices, dashboards — all poll.
Fine now; Supabase Realtime is the drop-in upgrade when user counts grow.

**F13. No tests, no CI gate.** Every regression in this project's history was
caught by a human or a Vercel build failure. Minimum viable: `tsc --noEmit`
+ ESLint as a GitHub Action on push (blocks broken builds reaching Vercel),
then unit tests for the pure libraries (`hpAnalytics`, `hpTests`, token
signing) which are trivially testable.

**F14. Multi-agent drift process risk.** Multiple AI sessions have edited
this repo in parallel; the build has broken from phantom imports once
already. Process fix, not code fix: one integration branch per session,
`tsc` locally before every commit (already adopted), and periodic fresh-zip
re-syncs for any session doing multi-file work.

---

## 4. Target architecture

```
app/
  (routes)                     — thin pages: layout + hooks + sections
  api/*/route.ts               — thin: auth → validate → service → respond
lib/
  supabaseAdmin.ts             — THE service-role client (this batch)
  playerAuth.ts                — THE player JWT verifier (this batch)
  alertsService.ts             — THE alert domain service (this batch)
  serverAuth.ts                — staff + HP auth (existing, keep)
  hpRepository / hpAnalytics   — model for other domains to copy
  push.ts                      — THE broadcast pipeline
  format.ts                    — shared date/time/outcome utils   (Phase 2)
  types/                       — per-domain row types             (Phase 2)
```

Rules going forward:
1. **Privileged data crosses the network only via API routes.** New pages
   never import the anon client for cross-tenant reads.
2. **One implementation per capability.** A second implementation of an
   existing capability is a bug, not a feature.
3. **Routes are ≤150 lines**; domain logic lives in `lib/` services.
4. **Pages are ≤400 lines**; state lives in hooks, UI in sections.

---

## 5. Roadmap

| Phase | Scope | Risk | Status |
|---|---|---|---|
| 1 | supabaseAdmin + playerAuth + alertsService; refactor 6 routes; fix F1/F2/F6 | Low (contracts preserved, tsc-verified) | **This zip** |
| 2 | Consolidate `notifications/*` into push pipeline; `lib/format.ts`; delete legacy `/player/[code]` stack after link audit | Low-med | Next |
| 3 | portal-admin decomposition (one domain/PR); shared types module | Med | Then |
| 4 | CI gate; unit tests for pure libs; Redis-backed rate limiting; Realtime | Low | Ongoing |

## 6. Verification playbook (Phase 1)

1. `npx tsc --noEmit` — clean.
2. `/lightning`: activate → banner appears on player profile, push received → all-clear.
3. Portal-admin → Safety tab: activate → **banner now appears** (this was the
   P0 — previously nothing happened) and push sends with a real count →
   resolve → banner drops.
4. Player app: profile loads, photo upload, QR check-in — unchanged.
5. `git grep -n "safety_alerts"` → only the migration file; table is retired
   (leave it in the DB; it's inert).
