// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// 🚀 SOTA: Only enable Sentry in production to avoid 403 errors in dev/preview
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (SENTRY_DSN && IS_PRODUCTION) {
    Sentry.init({
        dsn: SENTRY_DSN,

        // Adjust this value in production, or use tracesSampler for greater control
        tracesSampleRate: 0.1,

        // Setting this option to true will print useful information to the console while you're setting up Sentry.
        debug: false,
    });
} else {
    console.log('[Sentry] Disabled in development/preview environment');
}
