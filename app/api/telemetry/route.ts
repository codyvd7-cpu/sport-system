import { NextRequest, NextResponse } from 'next/server';

// ─── /api/telemetry ───────────────────────────────────────────────────────────
// Forwards browser error reports to Sentry through our own domain.
//
// Why this exists as a hand-written route rather than Sentry's `tunnelRoute`
// option: that option is implemented as a build-time rewrite that Turbopack
// doesn't generate, and Vercel builds this project with Turbopack. The result
// was a 404 on the tunnel path and silently zero error reports.
//
// Why tunnel at all: ad blockers and privacy extensions block *.sentry.io by
// default. Verified in a real browser — requests to the ingest endpoint failed
// outright. Without this, a meaningful share of coaches' and parents' errors
// would never arrive, which is exactly the visibility this is meant to provide.
//
// The path is deliberately NOT called "monitoring" or "sentry": those strings
// appear in blocklists themselves, so a tunnel named after them gets blocked
// too — which is precisely what happened on the first attempt.

const SENTRY_HOST = 'o4511897612189696.ingest.de.sentry.io';
const ALLOWED_PROJECT_IDS = ['4511897621233744'];

export async function POST(req: NextRequest) {
  try {
    const envelope = await req.text();
    // A Sentry envelope is newline-delimited JSON; the first line is the header
    // and carries the DSN.
    const firstLine = envelope.split('\n')[0];
    const header = JSON.parse(firstLine) as { dsn?: string };
    if (!header.dsn) return NextResponse.json({ error: 'Missing DSN.' }, { status: 400 });

    const dsn = new URL(header.dsn);
    const projectId = dsn.pathname.replace(/^\//, '');

    // Only forward to our own Sentry project — otherwise this becomes an open
    // relay that anyone could point anywhere.
    if (dsn.hostname !== SENTRY_HOST || !ALLOWED_PROJECT_IDS.includes(projectId)) {
      return NextResponse.json({ error: 'Invalid destination.' }, { status: 400 });
    }

    const upstream = await fetch(`https://${SENTRY_HOST}/api/${projectId}/envelope/`, {
      method: 'POST',
      body: envelope,
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
    });

    return new NextResponse(null, { status: upstream.ok ? 200 : 502 });
  } catch {
    // Never let telemetry failures surface to the user or throw server-side.
    return new NextResponse(null, { status: 200 });
  }
}
