'use client';
import * as React from 'react';

// ─── PortalAuthGuard ───────────────────────────────────────────────────────────
// The sport portal shows fixtures, results, the week ahead and department
// notices — the same information a school publishes on its own website. It
// holds nothing personal, so it is deliberately NOT gated behind a code.
//
// Requiring a code here was the single biggest source of friction in the parent
// journey: a school had to distribute it, parents had to be told it, and it
// blocked the one thing they actually wanted (Saturday's kick-off time). Every
// established platform in this space has learned the same lesson.
//
// Anything about an individual athlete — attendance, test results, coach
// feedback — sits behind a real account instead. That boundary is enforced
// server-side in the athlete routes, not here.
//
// Kept as a component (rather than deleted) so the gate can be reinstated for
// a school that specifically asks for one, without restructuring the portal.

export default function PortalAuthGuard({ children }: { children: React.ReactNode; sport?: string }) {
  return <>{children}</>;
}
