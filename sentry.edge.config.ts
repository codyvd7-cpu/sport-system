// Sentry — edge runtime (middleware and edge routes).
// Same privacy posture as the server config; see the comments there.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://06d2ec218f597571a276b1dd2aecf190@o4511897612189696.ingest.de.sentry.io/4511897621233744",

  tracesSampleRate: 0.1,
  enableLogs: true,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
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
    return event;
  },

  ignoreErrors: ['Unauthorized', 'Not found.', 'NEXT_NOT_FOUND', 'NEXT_REDIRECT'],
});
