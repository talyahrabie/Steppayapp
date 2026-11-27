import * as Sentry from '@sentry/react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Crash reporting (Sentry) — Phase 1 Batch B.
//
// STRICTLY opt-in by configuration: Sentry is initialised ONLY when
// EXPO_PUBLIC_SENTRY_DSN is present in the environment (see
// .env.example). Without a DSN nothing is initialised, nothing is sent
// anywhere, and the app behaves exactly as before — the wrap below is
// a pass-through and captureException is a no-op.
//
// When a DSN IS set, initialisation happens once at module import of
// the root layout, and the root component is wrapped with Sentry.wrap
// so native crashes and unhandled JS errors are reported.
// ─────────────────────────────────────────────────────────────────────────────

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** True only when a DSN is configured and Sentry was initialised. */
export const isSentryEnabled = Boolean(sentryDsn);

let initialised = false;

/** Initialise Sentry if (and only if) a DSN is configured. Idempotent. */
export function initSentry(): void {
  if (initialised || !sentryDsn) return;
  initialised = true;
  Sentry.init({
    dsn: sentryDsn,
    // Crash reporting only — no performance tracing, no session replay:
    // this app handles health-adjacent data and stays privacy-light.
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

/** Report an error to Sentry when enabled; otherwise a no-op. */
export function captureException(error: unknown): void {
  if (!isSentryEnabled) return;
  try {
    Sentry.captureException(error);
  } catch {
    // Reporting must never throw into the error path itself.
  }
}

/**
 * Wrap the root component with Sentry's error/native-crash handling
 * when enabled; returns the component unchanged when disabled.
 */
export function wrapWithSentry<T extends React.ComponentType<any>>(component: T): T {
  if (!isSentryEnabled) return component;
  return Sentry.wrap(component) as T;
}
