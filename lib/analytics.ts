import { supabase, isSupabaseConfigured } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Privacy-light product analytics — our own stack only (Phase 1 Batch B).
//
// Events are batched in memory and inserted into the `analytics_events`
// Supabase table (see supabase/schema.sql; insert-only RLS, so the app
// can write events but never read anyone's). There is deliberately NO
// third-party analytics SDK and NO new account: the data stays in the
// project's own database, next to everything else.
//
// Privacy rules:
//  - Props must never contain PII (no emails, names, phone numbers…).
//    `sanitizeProps` enforces a key denylist and keeps only primitive
//    values, so an accidental PII prop is dropped, not shipped.
//  - user_id is the signed-in user's id or null (anonymous events like
//    app_open before sign-in are allowed by the table's RLS policy).
//
// Reliability rules: analytics must never break the app or lose user
// data — the queue is in-memory only, flushes on size (FLUSH_THRESHOLD)
// and on app foreground/background transitions (wired in AppContext),
// and a failed insert DROPS the batch silently. Losing a few events is
// acceptable; blocking the UI for them is not.
// ─────────────────────────────────────────────────────────────────────────────

export type AnalyticsEventName =
  | 'app_open'
  | 'session_start'
  | 'steps_goal_reached'
  | 'reward_redeemed'
  | 'media_played'
  | 'health_sync_enabled';

export type AnalyticsProps = Record<string, string | number | boolean | null>;

export interface QueuedEvent {
  event: AnalyticsEventName;
  props: AnalyticsProps;
}

/** Flush automatically once this many events are queued. */
export const ANALYTICS_FLUSH_THRESHOLD = 10;

/** Prop keys that must never leave the device (PII / secrets). */
const PII_PROP_KEYS = new Set([
  'email',
  'name',
  'fullname',
  'full_name',
  'phone',
  'address',
  'password',
  'token',
  'user_id',
  'userid',
  'username',
]);

/**
 * Strip anything that is not a flat primitive prop and drop denylisted
 * (PII) keys. Pure — exported for tests.
 */
export function sanitizeProps(props?: Record<string, unknown> | null): AnalyticsProps {
  if (!props || typeof props !== 'object') return {};
  const clean: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_PROP_KEYS.has(key.toLowerCase())) continue;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      clean[key] = value;
    }
  }
  return clean;
}

/** Shape queued events into `analytics_events` insert rows. Pure. */
export function buildEventRows(
  events: QueuedEvent[],
  userId: string | null
): { user_id: string | null; event: string; props: AnalyticsProps }[] {
  return events.map((e) => ({ user_id: userId, event: e.event, props: e.props }));
}

let queue: QueuedEvent[] = [];
let currentUserId: string | null = null;
let flushing = false;

/** Set (or clear, on sign-out) the user id attached to future events. */
export function setAnalyticsUserId(userId: string | null): void {
  currentUserId = userId;
}

/** Snapshot of the in-memory queue (tests / debugging). */
export function getAnalyticsQueueSnapshot(): QueuedEvent[] {
  return [...queue];
}

/**
 * Queue an event. Props are sanitized; reaching the flush threshold
 * triggers a background flush. Never throws.
 */
export function trackEvent(
  event: AnalyticsEventName,
  props?: Record<string, unknown>
): void {
  try {
    queue.push({ event, props: sanitizeProps(props) });
    if (queue.length >= ANALYTICS_FLUSH_THRESHOLD) {
      void flushAnalytics();
    }
  } catch (e) {
    console.log('Analytics track failed:', e);
  }
}

/**
 * Insert every queued event into Supabase and clear the queue. The
 * batch is drained BEFORE the network call, so a failure drops the
 * events instead of retrying forever or double-inserting on the next
 * flush. Returns how many events were confirmed inserted (0 on any
 * failure). Never throws.
 */
export async function flushAnalytics(): Promise<number> {
  if (flushing || queue.length === 0) return 0;
  if (!isSupabaseConfigured) {
    queue = [];
    return 0;
  }
  flushing = true;
  const batch = queue;
  queue = [];
  try {
    const { error } = await supabase
      .from('analytics_events')
      .insert(buildEventRows(batch, currentUserId));
    if (error) {
      console.log('Analytics flush failed (events dropped):', error.message);
      return 0;
    }
    return batch.length;
  } catch (e) {
    console.log('Analytics flush failed (events dropped):', e);
    return 0;
  } finally {
    flushing = false;
  }
}

/** Test hook: clear the queue and user id between cases. */
export function resetAnalyticsState(): void {
  queue = [];
  currentUserId = null;
  flushing = false;
}
