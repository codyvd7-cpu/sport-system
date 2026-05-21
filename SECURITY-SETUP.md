# Security Hardening — What To Do After Deploying These Changes

This file lists every action you need to take **outside** of pushing the code.
Do these in order.

---

## 1. Update Environment Variables in Vercel

Go to **Vercel → your project → Settings → Environment Variables**.

### Add these new variables:

| Name | Value | Notes |
|------|-------|-------|
| `HP_ACCESS_CODE` | (your HP code) | **Server-only** — do NOT prefix with `NEXT_PUBLIC_` |
| `HP_SESSION_SECRET` | (a long random string) | Used to sign HP session cookies. Generate with `openssl rand -hex 32` or any random 64-char hex string |

### Remove this old variable:

| Name | Reason |
|------|--------|
| `NEXT_PUBLIC_HP_ACCESS_CODE` | This was exposed in the browser bundle — anyone could view-source and find it. The new server-side `HP_ACCESS_CODE` replaces it. |

### Confirm these are present:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (server-only, NO `NEXT_PUBLIC_` prefix)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only — if you have it, MAKE SURE it is NOT `NEXT_PUBLIC_`)

Hit **Save** and redeploy.

---

## 2. Run the SQL Setup in Supabase

Open `supabase-security-setup.sql` in this repo.

1. Copy the entire file contents
2. Open **Supabase Dashboard → SQL Editor**
3. Paste the SQL into a new query
4. Click **Run**

This will:
- Enable Row Level Security on every sensitive table
- Add policies so only authenticated staff can read/write
- Make Coach Notes and Staff Roles HOH-only for deletion
- Add unique constraints so duplicate records become impossible at the DB level
- Create an audit log table that tracks all deletes
- Create triggers that auto-log every delete from sensitive tables

### After running, verify:
- **Supabase → Database → Tables** — each table should show "RLS enabled" badge
- **Supabase → Authentication → Policies** — every sensitive table should have policies listed

---

## 3. Confirm Your Staff Role in the Database

Run this in **Supabase → SQL Editor**, replacing the email with yours:

```sql
insert into public.staff_roles (email, role, full_name, is_active)
values ('codyvd7@gmail.com', 'owner', 'Cody Van Dyk', true)
on conflict (email) do update
  set role = 'owner', is_active = true;
```

Make sure your HOH staff also have rows:

```sql
insert into public.staff_roles (email, role, full_name, is_active)
values
  ('lusibas@stbenedicts.co.za',  'head_of_hockey', 'Lusiba S',  true),
  ('mtiraras@stbenedicts.co.za', 'head_of_hockey', 'M. Tiraras', true)
on conflict (email) do update
  set role = excluded.role, is_active = true;
```

**This is critical** — the new AuthGuard will fail-closed if a user has no row in `staff_roles`. Without this step, your protected pages will lock out everyone including you.

---

## 4. Test the Live App

After Vercel redeploys, run through these checks:

- [ ] Log in with your owner account — Portal Admin loads
- [ ] Log in with a coach account (no role) — Portal Admin redirects to `/dashboard`
- [ ] Open `/hp-login`, enter HP code — redirects to `/hp` successfully
- [ ] Open `/hp` directly in an incognito tab — redirects to `/hp-login`
- [ ] Click "Generate AI Summary" on an athlete profile — works
- [ ] Open a new private window, hit `POST https://your-site/api/assistant` directly with no auth — get 401
- [ ] Save a performance test result twice on the same day — only one row exists in `performance_tests`

---

## 5. POPIA / Legal Steps (You Must Do These Personally)

This is a school system handling minors' data. South African POPIA law requires:

1. **Designated Information Officer** — usually the principal. Register them on the Information Regulator's site.
2. **Data Processing Agreement** — parents must consent to their child's data being stored, including AI-generated summaries sent to OpenAI.
3. **Right to deletion** — when a parent requests their child's data be removed, you must comply within reasonable time. Currently you would do this manually via Supabase. Consider adding a deletion request workflow in a future update.
4. **Breach notification policy** — if a security incident happens, you must inform the Information Regulator and affected parents.
5. **AI disclosure** — inform parents (and ideally the school) that anonymous-ish athlete performance data is sent to OpenAI for summary generation.

These are not optional for a school system. Get sign-off from SBC's principal/admin before sharing the tool wider.

---

## 6. Backups

Supabase free tier does NOT include automated backups.

Options:
- Upgrade Supabase to Pro plan ($25/month) — includes daily point-in-time recovery.
- Or set up a nightly export to S3/Backblaze using a Supabase Edge Function or external cron job.

Do this before relying on the system for real production data.

---

## 7. Optional but Recommended

- **Sentry** (free tier) for error tracking — `npm install @sentry/nextjs && npx @sentry/wizard`
- **Vercel Analytics** for traffic monitoring
- **Document an incident response plan** — who gets called, what to do, how to communicate with affected parties

---

## Summary

After all 7 steps:

| Layer | Status |
|-------|--------|
| Frontend access control | Fails closed via staff_roles |
| API authentication | Real JWT verification on every route |
| HP login | httpOnly signed cookie, no browser exposure |
| Rate limiting | 20–30 req per 5 min per IP on AI routes |
| Database RLS | All sensitive tables protected |
| Audit trail | Every delete logged immutably |
| Player codes | Cryptographic, unique-checked |
| Coach passwords | Cryptographic, 16 chars |
| HTTP headers | CSP, HSTS, X-Frame-Options, no Referer leak |
| Build correctness | No `ignoreBuildErrors` hiding bugs |

The app is now in good shape for trusted staff use across the school. Before commercial sale to other schools, also do:
- Multi-tenant architecture (each school's data isolated)
- KINETIQ rebrand
- POPIA paperwork standardised for any school
