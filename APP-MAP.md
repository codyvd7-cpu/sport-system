# Altus — how the app fits together

A plain map of every part, grouped by who uses it. 62 pages, 63 API endpoints.
The single biggest reason it feels hard to follow: **a third of the app (20
pages) is the HP module, which you've parked.** Mentally set that aside and the
real product is much smaller.

---

## 1. The front door (anyone, not logged in)

| Page | What it is |
|---|---|
| `/` | Bare landing — "choose your school" picker |
| `/[school]` e.g. `/ridgemont` | A school's own landing page with its sport tiles |
| `/login` | Coach / staff sign-in |
| `/player/auth` | Player / parent sign-in + sign-up |

**How they connect:** someone lands on `/` or a school link → picks a school →
sees sport tiles → taps one → lands in the **portal**.

---

## 2. The portal (parents & players — mostly public)

| Page | What it is |
|---|---|
| `/portal` | The open sport page: fixtures, results, week ahead, sponsors |
| `/portal-login` | Retired — now just redirects into `/portal` |
| `/portal/fixtures`, `/portal/fixtures/season` | Full fixture & results lists |
| `/parent/welcome` | Where a magic-link invite lands a parent |

**Fed by:** `/api/portal/data` (the open content), `/api/portal/fixtures`.
**No login needed** to see fixtures/results. Anything personal needs an account.

---

## 3. The player's own account (logged-in player/parent)

| Page | What it is |
|---|---|
| `/player/auth` | Sign in / sign up |
| `/player/setup` | **Self-registration** — identity, physical, sport, medical |
| `/player/profile` | Their own stats, goals, selection, clips, feedback |
| `/player/checkin` | Gym / training check-in |

**The flow:** sign up → `/player/setup` creates their athlete record (they own
it) → they're `pending_team` → a coach enrols them → their profile fills with
fixtures, selection, stats.
**Fed by:** `/api/player/register` (setup), `/api/player/me` (profile data).

---

## 4. The coach side (logged-in staff) — the core product

| Page | What it is | Fed by |
|---|---|---|
| `/dashboard` | Coach home: inbox, team pulse, department health | `/api/coach/inbox`, `/api/coach/pulse` |
| `/athletes`, `/athletes/[id]` | The roster and each athlete's full profile | direct DB + `/api/athlete/*` |
| `/athletes/import` | Bulk paste-in athletes | `/api/athletes/import` |
| `/enrolment` | **New players** waiting to be put in a team | `/api/coach/enrolment` |
| `/attendance` | Take the register | direct DB + `/api/athlete/status` |
| `/selection` | **Pick a matchday team** | `/api/coach/selection` |
| `/performance` | Testing + SpeedGate | `/api/athlete/speedtest` |
| `/retest` | Who's overdue for testing | `/api/coach/retest` |
| `/claims` | Approve parent links + invite parents | `/api/coach/claims`, `/api/parents/invite` |
| `/coaches`, `/coaches/[id]` | Staff management | `/api/admin/coach-photo` |

**The spine:** athletes exist (self-registered or imported) → coach enrols them
into teams → takes attendance → the register feeds **selection** → selection
shows on the player's profile. Attendance + testing feed the **dashboard inbox**
(who needs attention).

---

## 5. Portal admin (staff edit what parents see)

`/portal-admin` — one page, tabbed: Fixtures, Results, Week plan, Notices,
Spotlight, Sponsors, Programmes, Player profiles. Everything a coach publishes
to the portal is managed here. Scoped to their own school by a DB trigger.

---

## 6. Platform admin (just you)

| Page | What it is |
|---|---|
| `/platform/schools` | Create & configure schools |
| `/notifications` | Send push alerts |
| `/lightning` | Trigger the urgent weather banner |

---

## 7. The HP module — PARKED (20 pages, one third of the app)

`/hp`, `/hp/students`, `/hp/classes`, `/hp/testing`, `/hp/trends`, `/hp/import`,
all the `/hp-print/*` and `/hp/export/*` pages, `/hp-login`, `/hp/link`…

This is the high-performance-classes system built for the original pilot school.
It has its **own login, its own data tables, its own everything** — it barely
touches the main app. **This is the biggest chunk of "stuff I don't understand
how it links" — because it mostly doesn't link.** Decision still open: keep or
remove. If removed, the app drops from 62 pages to ~42 and gets dramatically
easier to reason about.

---

## 8. Known loose ends in the wiring

- **`/player/[code]` is a zombie** — a legacy page that keeps reappearing in the
  codebase (5+ times). It's old, uses outdated branding, and should be deleted
  for good at source.
- **`/auth/confirm`** — email confirmation landing, only used by the signup flow.
- A few API routes have no UI calling them (team-report, portal/leaderboard) —
  some are deliberate, some were orphans we reconnected.

---

## The one-sentence version

**Players self-register → coaches enrol them into teams → coaches run attendance,
testing and selection → the dashboard surfaces who needs attention → parents see
fixtures and their own child on the portal.** Everything else (HP, platform
admin, portal-admin) hangs off the side of that spine.
