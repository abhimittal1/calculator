/**
 * SentryService
 *
 * Single entry-point for all Sentry SDK calls in the app.
 *
 * WHY A WRAPPER?
 * ─────────────
 * Centralising the import prevents every module from depending directly on
 * @sentry/react-native, which would make unit tests fragile.  Tests can mock
 * this module in one place instead.
 *
 * SETUP STEPS (one-time, per developer)
 * ──────────────────────────────────────
 * 1. Create a free project at https://sentry.io (platform: "React Native").
 * 2. Copy the DSN from Project Settings → Client Keys.
 * 3. Set the SENTRY_DSN environment variable **or** replace the fallback
 *    string below with your real DSN.
 *
 *    Option A — env var (recommended for CI / multiple developers):
 *      Add to your shell profile or .env (not committed):
 *        SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project-id>
 *
 *    Option B — hardcode the non-secret DSN directly (DSNs are public-facing
 *      endpoints that Sentry intentionally exposes; rate-limiting is done
 *      server-side by your project's key configuration):
 *        Replace 'YOUR_SENTRY_DSN_HERE' with the copied value.
 *
 * 4. Run `npx @sentry/wizard@latest -i reactNative` to auto-patch the
 *    Android Gradle files for source-map uploads (recommended for production).
 */

import * as Sentry from '@sentry/react-native';

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * DSN (Data Source Name) — public endpoint that tells the SDK where to send
 * events.  Safe to commit; Sentry controls access via project-level key rules.
 *
 * Replace 'YOUR_SENTRY_DSN_HERE' or set the SENTRY_DSN env var.
 */
const DSN: string =
  // Metro replaces process.env.*  at bundle time via the `@react-native/babel-preset`.
  // Falls back to the placeholder so the app doesn't crash if the var is unset.
  (typeof process !== 'undefined' && process.env.SENTRY_DSN) || 'YOUR_SENTRY_DSN_HERE';

/** Semantic release string forwarded to every Sentry event. */
const RELEASE = '1.0.0';

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * Call once, at the very top of `index.js`, **before** `AppRegistry`.
 * Subsequent calls are no-ops (Sentry guards against double-init).
 */
export function initSentry(): void {
  Sentry.init({
    dsn: DSN,
    // 'development' or 'production' — used to filter events in the dashboard.
    environment: __DEV__ ? 'development' : 'production',
    // Attach the JS bundle release version so stack frames resolve correctly
    // against uploaded source maps.
    release: RELEASE,
    // Capture 100 % of sessions for crash-free-rate measurement.
    // Lower this (e.g. 0.2) in high-traffic production builds.
    tracesSampleRate: __DEV__ ? 0 : 1.0,
    // Disable the default Sentry console integration in dev — we already log.
    integrations: integrationList => integrationList.filter(i => i.name !== 'Console'),
    // Silence Sentry's own debug output in development builds.
    debug: false,
  });
}

// ─── Re-export helpers used across the codebase ───────────────────────────────

export const {
  captureException,
  captureMessage,
  addBreadcrumb,
  withScope,
  wrap: sentryWrap,
} = Sentry;

/** The default Sentry export — needed for `Sentry.wrap(App)` in index.js. */
export default Sentry;
