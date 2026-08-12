// Sentry — browser. Runs whenever someone loads a page.
//
// Same reasoning as the server config: children's data must not leave the app.
// Session Replay is deliberately NOT enabled — it records actual screens,
// which in this app means athlete records, coach notes and test results.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://06d2ec218f597571a276b1dd2aecf190@o4511897612189696.ingest.de.sentry.io/4511897621233744",

  // Send through our own domain rather than directly to sentry.io, so ad blockers
  // don't silently drop reports. See app/api/telemetry/route.ts.
  tunnel: "/api/telemetry",

  tracesSampleRate: 0.1,
  enableLogs: true,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
  enabled: process.env.NODE_ENV === 'production',

  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },

  beforeSend(event) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
      if (event.request.query_string) delete event.request.query_string;
      if (event.request.url) event.request.url = event.request.url.split('?')[0];
    }
    delete event.user;

    // Breadcrumbs record the user's path through the app. Useful for
    // reproducing a bug, but URLs here carry athlete ids and access codes.
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(b => {
        if (b.data && typeof b.data === 'object') {
          const d = b.data as Record<string, unknown>;
          if (typeof d.url === 'string') d.url = d.url.split('?')[0];
          delete d.body;
          delete d.input;
        }
        return b;
      });
    }
    return event;
  },

  ignoreErrors: [
    'Unauthorized',
    'Not found.',
    'AbortError',
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    // Browser extensions and network blips — noise, not app faults
    'ResizeObserver loop',
    'Non-Error promise rejection captured',
    'Failed to fetch',
    'NetworkError',
    'Load failed',
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
