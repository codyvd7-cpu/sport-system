# Multi-School Isolation Test

Run this **before onboarding the first real second school.** The SQL audit
(`supabase-isolation-audit.sql`) catches data-level problems; this catches the
ones only a real login can find — a coach seeing the wrong school's screen.

Budget about 45 minutes. Do it once properly, and you can trust the foundation.

---

## Setup

1. **Create a test school** at `/platform/schools`
   - Name: `Test Academy` · slug: `test-academy` · abbreviation: `TA`
   - Pick a **deliberately different primary colour** (e.g. bright red `#ef4444`)
     so branding leaks are obvious at a glance
   - Set latitude/longitude somewhere far away (e.g. Cape Town: `-33.92`, `18.42`)
     so a weather leak is equally obvious

2. **Create a test coach for it**
   - In Supabase → `staff_roles`, add a row: their email, role `owner`,
     `school_id` = Test Academy's id, `is_active` = true
   - Invite/sign them up so they can actually log in
   - ⚠️ Use an email you control that is **not** your platform admin email

3. **Add a little test data** while logged in as that coach
   - 2–3 athletes on a team named something distinctive (`TA-Test-Team`)
   - One fixture, one result, one reminder

---

## The tests

Mark each ✅ or ❌. **Any ❌ stops the rollout** until it's fixed.

### Coach app (logged in as the Test Academy coach)

- [ ] `/athletes` shows **only** Test Academy athletes — zero School 1 names
- [ ] `/dashboard` team list shows only Test Academy teams
- [ ] `/attendance` register lists only Test Academy athletes
- [ ] Athlete search/filter can't surface a School 1 athlete by name
- [ ] Opening an athlete profile shows only their own school's data
- [ ] `/portal-admin` fixtures/results/reminders show only Test Academy's
- [ ] Creating a fixture here does **not** appear in School 1's portal-admin
- [ ] Nav bar shows Test Academy's name, logo, and red accent — not School 1's

### Direct URL access (the important one)

Copy a **School 1** athlete's id from Supabase, then, still logged in as the
Test Academy coach, visit `/athletes/<that-school-1-athlete-id>` directly.

- [ ] The page does **not** show that athlete's data (blank/error/redirect is fine)

Repeat for a School 1 fixture id in portal-admin if reachable by URL.

### HP module

- [ ] Log in with School 1's HP code → see only School 1 students
- [ ] Add an `hp_access_codes` row for Test Academy, log in with that code →
      see **zero** School 1 students
- [ ] HP export/backup as Test Academy contains only Test Academy rows
      (open the downloaded JSON and check)
- [ ] Print/export pages show Test Academy's name and logo

### Parent portal

- [ ] Add a `portal_access_codes` row for Test Academy
- [ ] Log in to the portal with **School 1's** code → only School 1 fixtures
- [ ] Log in with **Test Academy's** code → only Test Academy fixtures
- [ ] Portal branding matches whichever school you logged in as

### Player app

- [ ] Sign up a player, link to a Test Academy athlete
- [ ] Their profile shows only Test Academy data
- [ ] Their Training tab shows only Test Academy workout programs
- [ ] Team leaderboard shows only Test Academy teammates

### Alerts and notifications (do these last — they send real pushes)

- [ ] Enable notifications on a device as a School 1 user
- [ ] Trigger a lightning alert **as Test Academy** → School 1's device
      must **not** receive it
- [ ] Trigger as School 1 → confirm School 1's device **does** receive it
- [ ] Test Academy's active alert does not appear on School 1's portal banner

### Weather

- [ ] As Test Academy (Cape Town coords), fixture-day weather differs from
      School 1's forecast — same forecast for both means the school-scoped
      cache or lookup is broken

---

## After the test

1. Run `supabase-isolation-audit.sql` again — sections A and B should still be
   all zeros after all this activity.
2. Deactivate Test Academy at `/platform/schools`, or delete its rows entirely.
3. Note the date you ran this and anything you found.

**Re-run this whenever:** a new table gets added, RLS policies change, or
before onboarding each of the first few schools.
