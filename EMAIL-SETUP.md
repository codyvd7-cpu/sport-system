# Fixing signup email — one-time setup (~20 min)

**The problem:** signup and parent invites both send an email through Supabase's
built-in email service, which is capped at ~2–4 emails per hour across the whole
project. Once that's spent, every signup fails with "Error sending confirmation
email." The fix is to point Supabase at a real email provider (Resend). This is
account + DNS setup, not code — the code side is already done.

Do these in order.

---

## 1. Create a Resend account (5 min)

1. Go to **resend.com** → Sign up (free tier sends 3,000 emails/month, plenty).
2. Once in, go to **API Keys** (left sidebar) → **Create API Key**.
   - Name it `altus-supabase`.
   - Permission: **Full access**.
   - **Copy the key now** — it starts `re_...` and is shown only once. Paste it
     somewhere safe for step 3.

---

## 2. Verify your sending domain (10 min, mostly waiting)

This is what stops your emails going to spam.

1. In Resend → **Domains** → **Add Domain**.
2. Enter `altusperformance.co.za` → Add.
3. Resend shows you **3 DNS records** (an MX and two TXT, for DKIM/SPF). Each has
   a Type, Name, and Value.
4. Go to wherever your domain's DNS is managed (the registrar or Cloudflare — the
   same place the `app.` and `www.` records live) and add all 3 exactly as shown.
   - Copy-paste the values; a single wrong character fails verification.
5. Back in Resend, click **Verify**. It may take a few minutes to an hour for DNS
   to propagate — you can move on and check back. It'll go green when ready.

> If you can't find your DNS management, tell me who your domain registrar is and
> I'll point you to the exact screen.

---

## 3. Connect Resend to Supabase (5 min)

1. Supabase dashboard → your project → **Project Settings** (gear, bottom left)
   → **Authentication** → scroll to **SMTP Settings** → toggle **Enable Custom SMTP**.
2. Fill in exactly:

   | Field | Value |
   |---|---|
   | **Host** | `smtp.resend.com` |
   | **Port** | `465` |
   | **Username** | `resend` |
   | **Password** | your `re_...` API key from step 1 |
   | **Sender email** | `noreply@altusperformance.co.za` |
   | **Sender name** | `Altus Performance` |

3. **Save**.

> The sender email's domain **must** be the one you verified in step 2, or Resend
> rejects it. `noreply@altusperformance.co.za` is fine.

---

## 4. Raise the rate limit (1 min)

The built-in limit stays in place even with custom SMTP until you lift it.

1. Supabase → **Authentication** → **Rate Limits**.
2. Find **"Rate limit for sending emails"** — bump it from the default (a few/hour)
   to something like **100 per hour**. Resend can handle far more; this is just
   Supabase's own throttle.
3. Save.

---

## 5. Test it (2 min)

1. Open the app in an incognito window → go to create a player account with a real
   email address you can check.
2. You should receive a confirmation email within a minute, from
   `noreply@altusperformance.co.za`.
3. If it arrives → **done**, the whole signup + invite flow now works.
4. If it doesn't:
   - Check Resend → **Emails** (it logs every send attempt and why one failed).
   - Most common cause: domain not fully verified yet (step 2 still amber).

---

## What's already handled in code

- Signup no longer shows a raw "Error sending confirmation email" — if delivery
  fails, the user is told the account exists and to sign in.
- Parent-invite failures now say plainly when the cause is email configuration
  rather than a bad address.

So even before you finish this setup, the app won't show scary errors — it just
can't deliver mail until step 3 is done.
