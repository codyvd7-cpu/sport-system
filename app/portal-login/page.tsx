// ─── /portal-login ─────────────────────────────────────────────────────────────
// This route no longer gates anything — the portal is open, since fixtures and
// results are the same information a school publishes on its own website.
//
// WHY IT RENDERS THE PORTAL RATHER THAN REDIRECTING:
// Something in the deployed environment sends /portal here. It is not in the
// application source (no middleware, no next.config redirects, no vercel.json,
// nothing in app/portal/page.tsx), the latest commit is confirmed live, and a
// cache-cleared rebuild did not change it. Having this route redirect back to
// /portal therefore produced an infinite loop that made the parent journey
// unusable.
//
// Rather than keep chasing a redirect that cannot be located, this route now
// renders the portal directly. Whatever routes a visitor here, they get the
// page they were asking for. If the underlying redirect is ever identified and
// removed, this file can go back to being a simple redirect — or be deleted —
// without changing anything a parent sees.
export { default } from '../portal/page';
