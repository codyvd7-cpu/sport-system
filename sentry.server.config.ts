// Sentry — server. Runs whenever the server handles a request.
//
// Configured deliberately rather than on defaults, because this app processes
// children's personal information on behalf of schools. Out of the box, Sentry
// attaches user data and full HTTP bodies to every error — which here would
// mean athlete names, parent emails and test results leaving the database and
// landing in a third-party error tracker.
//
// Hosted in the EU region (ingest.de.sentry.io), same jurisdiction as the
// Supabase instance, so the cross-border position in the Operator Agreement
// holds without amendment.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://06d2ec218f597571a276b1dd2aecf190@o4511897612189696.ingest.de.sentry.io/4511897621233744",

  // 10% of transactions. Enough to spot a systemic problem, without burning
  // the quota on a healthy app.
  tracesSampleRate: 0.1,

  enableLogs: true,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Don't report from local development — otherwise real production problems
  // get buried under noise from work in progress.
  enabled: process.env.NODE_ENV === 'production',

  dataCollection: {
    userInfo: false,   // no IP addresses, no user identifiers
    httpBodies: [],    // no request or response bodies
  },

  // POPIA: strip anything that could carry personal information before it
  // leaves the server. Sentry needs to know WHERE it broke, never WHO it broke
  // for — an error is just as fixable without the child's name attached.
  beforeSend(event) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
      // Query strings routinely carry athleteId, email, codes
      if (event.request.query_string) delete event.request.query_string;
      // Keep the path (which route failed) but drop the query
      if (event.request.url) event.request.url = event.request.url.split('?')[0];
    }
    delete event.user;
    return event;
  },

  // Expected conditions, not faults. Left unfiltered they drown the real
  // problems: an expired session is the auth system working correctly.
  ignoreErrors: [
    'Unauthorized',
    'Not found.',
    'AbortError',
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],
});
