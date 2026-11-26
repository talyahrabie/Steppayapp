// ─────────────────────────────────────────────────────────────────────────────
// Pure step-counting logic for the pedometer engine.
//
// Extracted from app/hooks/usePedometer.ts so the tricky arithmetic can be
// unit-tested without React Native or a sensor. Everything here is a pure
// function of its arguments — no storage, no globals, no clock reads except
// through values passed in.
//
// SOURCE-OF-TRUTH RULE (per tracking session):
//   `Pedometer.getStepCountAsync` (the OS day total) is authoritative. It is
//   read at init and on every app foreground and SETS the accounted total
//   for today. `Pedometer.watchStepCount` contributes only DELTAS measured
//   after the subscription starts (its cumulative counter starts at ~0 at
//   subscription time). Because catch-up always runs before subscribing,
//   and watch deltas only ever cover post-subscription steps, the two
//   sources never add the same steps twice.
// ─────────────────────────────────────────────────────────────────────────────

export interface WatchDelta {
  /** New steps since the previous watch event (never negative). */
  delta: number;
  /** The cumulative value to remember as the baseline for the next event. */
  baseline: number;
  /** True when the cumulative counter went backwards (reboot/sensor restart). */
  reset: boolean;
}

/**
 * Compute the delta between two consecutive `watchStepCount` cumulative
 * readings.
 *
 * - First reading (`prev === null`): establishes the baseline, delta 0 —
 *   steps walked before the subscription are recovered by the OS catch-up,
 *   not by the watch stream.
 * - Normal case (`next >= prev`): delta is the difference.
 * - Counter reset (`next < prev`): the device rebooted or the sensor
 *   restarted, so the cumulative counter started over. The steps between
 *   the last reading and the reset are unrecoverable from the watch stream
 *   (the OS catch-up reconciles the day total on the next foreground), so
 *   the delta is 0 and `next` becomes the fresh baseline. A reset must
 *   NEVER produce a negative delta.
 */
export function computeWatchDelta(
  prevCumulative: number | null,
  nextCumulative: number
): WatchDelta {
  const next = Math.max(0, Math.floor(nextCumulative));
  if (prevCumulative === null) {
    return { delta: 0, baseline: next, reset: false };
  }
  const prev = Math.max(0, Math.floor(prevCumulative));
  if (next < prev) {
    return { delta: 0, baseline: next, reset: true };
  }
  return { delta: next - prev, baseline: next, reset: false };
}

export interface SensorCatchUp {
  /** The day total to treat as accounted after reconciliation. */
  todayTotal: number;
  /** Steps not yet fed into the points engine (never negative). */
  newSteps: number;
}

/**
 * Reconcile the app's accounted total for today with the OS sensor's
 * authoritative total for today. The sensor can only move the total UP:
 * if it reports less than we have already accounted (e.g. a partial
 * provider on Android), we keep our accounted total rather than erasing
 * steps the watch stream legitimately counted.
 */
export function applySensorCatchUp(
  accountedToday: number,
  sensorToday: number
): SensorCatchUp {
  const accounted = Math.max(0, Math.floor(accountedToday));
  const sensor = Math.max(0, Math.floor(sensorToday));
  const todayTotal = Math.max(accounted, sensor);
  return { todayTotal, newSteps: todayTotal - accounted };
}

/**
 * Decide whether a day rollover has happened: the stored current-day key
 * differs from today's key. Pure string comparison — the caller supplies
 * both keys (from lib/config's todayKey()).
 */
export function isDayRollover(currentDateKey: string, nowDateKey: string): boolean {
  return currentDateKey !== nowDateKey;
}

/** Parse a `YYYY-MM-DD` key into a local Date at the start of that day. */
export function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** Start-of-day Date for a `YYYY-MM-DD` key (local time). */
export function startOfDayKey(dateKey: string): Date {
  const d = dateFromKey(dateKey);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End-of-day Date for a `YYYY-MM-DD` key (local time, 23:59:59.999). */
export function endOfDayKey(dateKey: string): Date {
  const d = dateFromKey(dateKey);
  d.setHours(23, 59, 59, 999);
  return d;
}
