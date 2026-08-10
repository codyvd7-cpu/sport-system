# Altus — Roadmap & Status

The running record of what's built, what's outstanding, and what was
deliberately decided against. Kept in the repo so it survives between working
sessions.

**Last updated:** August 2026

---

## Done and live

### Platform / architecture
- **Multi-school (multi-tenant)** — every table carries `school_id`, RLS scoped
  per school, verified in production with two real schools
- **Per-school branding** — name, logo, colours, weather coordinates, sports
  list all resolve from the `schools` table
- **Per-school sports** — schools only see the sports they actually run
- **School onboarding** — `/platform/schools`, gated on `PLATFORM_ADMIN_EMAILS`,
  auto-generates HP and portal access codes
- **Demo school** — Ashford Grammar, fully fictional, distinct branding so any
  leak between schools is visible at a glance
- **Branding removed** — all references to the original pilot school gone,
  including their photography, motto and founding date

### Athlete development
- **Athlete event timeline** (`athlete_events`) — the history spine. Records
  availability changes, coach notes, test results, check-ins, workouts, PBs,
  absences, goals and injuries
- **Coach Inbox** — today's fixtures, who needs attention (with reasons), what
  changed recently
- **Individual Development Plans** — closed loop: baseline → target → retest →
  outcome, linked to real test data
- **Return-to-Play protocol** — stages configurable per school, medical
  clearance enforced as a gate, baseline comparison built in
- **Session RPE** — `session_load` table + API (**no UI yet — see below**)

### Legal / compliance
- Privacy Policy and Terms of Use (POPIA dual-role model)
- Operator Agreement draft (POPIA s.21 — legally required per school)
- School Licence Agreement draft
- PAIA Manual draft (needs addresses filled in)
- Data Breach Response Plan draft
- Mutual NDA draft
- All are **drafts for attorney review**, not finished documents

---

## Outstanding

### Near-term
- [x] **Retest workflow** — `/api/coach/retest`. Reports HP and coach-side
      populations separately and merges them wherever a link exists
- [x] **HP student ↔ athlete linking** — `/hp/link`. Explicit, human-confirmed
      links so one person has one development record. HP test results now
      display on the athlete profile Performance tab when linked
- [ ] **Full isolation test** — `ISOLATION-TEST.md`. Core paths verified in the
      browser; the full checklist (player app, alerts, direct URL access) is
      not yet run. **Should happen before a second real school onboards** —
      this is children's data across institutions
- [x] **Head of Sport view** — department health by component (attendance,
      testing coverage, availability, development, coach activity), each with
      its status and evidence. Per-team breakdown table. No composite score
- [ ] **Coach-side overhaul part 2** — attendance flow speed-up, athletes
      browsing. Dashboard was part 1 and is done

### Housekeeping
- [ ] 410 lint warnings (0 errors — non-blocking, but worth a pass)
- [ ] `hp_sessions` table is empty but load-bearing (`hp_attendance` has an FK
      to it) — leave alone unless that FK is removed first
- [ ] Weak demo access codes (`Hockey`, `Rugby`, `HP2026`) — fine for demo
      data, must not carry into a real school

### Deliberately deferred
Video, Coach Command Bar, AI Daily Brief, Weekly Debrief, Season Story,
verified athlete profile, season planner, hardware integrations.

### Deliberately rejected
- **Injury prediction** — medical liability, false confidence, and the data
  doesn't support the claim
- **Composite athlete scores** ("Development Index: 83/100") — false precision
  that hides what a coach actually needs
- **Phone-based biomechanics / AI movement analysis** — unvalidated, high
  support burden, outside the core advantage
- **Training impact prediction** — needs reliable longitudinal data that
  doesn't exist yet
- **Whole-school management** (fees, academics, general attendance) — the wedge
  is sport; integrate rather than rebuild

---

## Standing rules for this project

1. **Verify before assuming.** Every change gets `tsc --noEmit` and `eslint`
   before delivery. Database claims get checked against the live database.
2. **Additive over destructive.** New tables and features sit alongside what
   exists rather than replacing it. Nothing that currently works should break.
3. **No invented certainty.** No score, prediction or recommendation that the
   underlying data can't actually support. Explainable flags with their
   evidence, never black-box numbers.
4. **A feature that can't be reached doesn't count.** If it has no route in
   from a main screen, it isn't finished.
5. **Nothing school-specific in code.** Anything that varies by school lives in
   the database.
