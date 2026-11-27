// ─────────────────────────────────────────────────────────────────────────────
// Notification decision logic — PURE functions only (no native imports),
// so the scheduling/firing rules can be unit-tested in Node and reused
// by lib/notifications.ts (the expo-notifications wrapper) and by the
// pedometer hook that detects the daily-goal crossing.
//
// Rules encoded here:
//  - The daily reminder is a single repeating local notification in the
//    evening (REMINDER_HOUR). Enabling the setting schedules it,
//    disabling cancels it; without OS permission nothing is scheduled.
//  - The goal-reached congratulation fires AT MOST ONCE PER DAY, the
//    first time today's credited total reaches the daily goal. The
//    caller persists the day key it last fired for; this module only
//    decides.
// ─────────────────────────────────────────────────────────────────────────────

/** Local hour (24h) of the daily step-goal reminder. */
export const REMINDER_HOUR = 19;
/** Local minute of the daily step-goal reminder. */
export const REMINDER_MINUTE = 0;

/**
 * The next moment the daily reminder should fire: today at
 * REMINDER_HOUR:REMINDER_MINUTE when that is still in the future,
 * otherwise tomorrow at the same time. (The repeating DAILY trigger
 * used on-device is anchored by hour/minute; this helper exists for
 * display/tests and for any one-shot scheduling fallback.)
 */
export function nextReminderDate(
  now: Date,
  hour: number = REMINDER_HOUR,
  minute: number = REMINDER_MINUTE
): Date {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export type ReminderAction = 'schedule' | 'cancel' | 'none';

/**
 * What to do with the daily reminder given the user's setting and the
 * OS permission state:
 *  - setting off            → cancel any scheduled reminder
 *  - setting on + granted   → (re)schedule it
 *  - setting on + no grant  → none (the caller may ask for permission;
 *                             scheduling without it would fail anyway)
 */
export function decideReminderAction(input: {
  enabled: boolean;
  permissionGranted: boolean;
}): ReminderAction {
  if (!input.enabled) return 'cancel';
  if (!input.permissionGranted) return 'none';
  return 'schedule';
}

/**
 * True exactly when today's credited step total reaches the goal for
 * the first time today — i.e. the total is at/over the goal AND the
 * congratulation has not already fired for this day key. Firing is
 * keyed by day, so app restarts and repeated step updates can never
 * spam the user.
 */
export function isFirstGoalCrossingToday(input: {
  todaySteps: number;
  goal: number;
  lastFiredDateKey: string | null;
  today: string;
}): boolean {
  if (input.goal <= 0) return false;
  if (input.todaySteps < input.goal) return false;
  return input.lastFiredDateKey !== input.today;
}

/**
 * Whether the goal congratulation should also be DELIVERED as a local
 * notification (the analytics event fires on every first crossing
 * regardless; the notification additionally needs the user's setting
 * and the OS permission).
 */
export function shouldDeliverGoalNotification(input: {
  isCrossing: boolean;
  enabled: boolean;
  permissionGranted: boolean;
}): boolean {
  return input.isCrossing && input.enabled && input.permissionGranted;
}
