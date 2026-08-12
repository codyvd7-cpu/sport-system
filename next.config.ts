import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from 'next';

// Build a sensible Content Security Policy.
// 'unsafe-inline' on styles is needed for Tailwind's runtime styles.
// 'unsafe-eval' on scripts is required by Next.js dev tooling.
const cspProd = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Browser error reports tunnel through our own domain (/api/telemetry), so
  // 'self' covers them; the explicit Sentry host is a fallback for anything
  // that bypasses the tunnel.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://fcm.googleapis.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.ingest.de.sentry.io",
  // YouTube player for video review. Without this the embedded player is
  // blocked by default-src and the review room renders an empty box.
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "script-src-elem 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const cspDev = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://*.ingest.de.sentry.io ws://localhost:* http://localhost:*",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "script-src-elem 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const isDev = process.env.NODE_ENV !== 'production';

const securityHeaders = [
  { key: 'Content-Security-Policy', value: isDev ? cspDev : cspProd },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "altus-u0",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // NOTE: Sentry's built-in `tunnelRoute` is deliberately NOT used. It is a
  // build-time rewrite that Turbopack does not generate, and Vercel builds this
  // project with Turbopack — the result was a 404 and silently zero error
  // reports. Tunnelling is instead handled by app/api/telemetry/route.ts, which
  // works regardless of bundler. See the comments in that file.

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
