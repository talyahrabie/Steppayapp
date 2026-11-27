import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  DAILY_STEP_GOAL,
  stepsToCalories,
  stepsToDistanceKm,
  stepsToPoints,
  toDateKey,
} from './config';
import {
  getUnsyncedStepFlags,
  markStepFlagsSynced,
} from './antiCheat';

// ─────────────────────────────────────────────────────────────────────────────
// Daily step history.
//
// Local source of truth: a `{ 'YYYY-MM-DD': steps }` map in AsyncStorage
// (key `step_history_v1`), written by the pedometer hook whenever the step
// count changes. When the user is signed in (and auto-sync is on), each day
// is also upserted to the Supabase `daily_steps` table so history survives
// reinstalls and is visible on other devices.
// ─────────────────────────────────────────────────────────────────────────────

const HISTORY_KEY = 'step_history_v1';

/**
 * Date keys whose cloud sync has been attempted and FAILED (offline,
 * server error, …). Persisted so a failed upsert is never silently
 * dropped: `flushPendingDaySyncs` retries them on the next app start,
 * sign-in or foreground until they succeed.
 */
const PENDING_SYNC_KEY = 'step_history_pending_sync_v1';

export interface DayRecord {
  /** Local date key, `YYYY-MM-DD`. */
  date: string;
  steps: number;
  distanceKm: number;
  calories: number;
  points: number;
  goalReached: boolean;
}

const toRecord = (date: string, steps: number): DayRecord => ({
  date,
  steps,
  distanceKm: stepsToDistanceKm(steps),
  calories: stepsToCalories(steps),
  points: stepsToPoints(steps),
  goalReached: steps >= DAILY_STEP_GOAL,
});

/** Read the full local history map (`{ date: steps }`). */
export async function getAllHistory(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.log('Error reading step history:', e);
    return {};
  }
}

/** Steps recorded locally for one day (0 when nothing recorded). */
export async function getDaySteps(dateKey: string): Promise<number> {
  const history = await getAllHistory();
  return history[dateKey] ?? 0;
}

/** Store the absolute step total for a day (overwrites the previous value). */
export async function recordDaySteps(dateKey: string, steps: number): Promise<void> {
  try {
    const history = await getAllHistory();
    history[dateKey] = steps;
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.log('Error saving step history:', e);
  }
}

/**
 * Records for the last `days` days ending today, oldest first.
 * Days with no data are included as zero-step records so charts and
 * averages reflect reality.
 */
export async function getHistoryRange(days: number): Promise<DayRecord[]> {
  const history = await getAllHistory();
  const records: DayRecord[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = toDateKey(d);
    records.push(toRecord(key, history[key] ?? 0));
  }
  return records;
}

/** Date keys still waiting for a successful cloud sync. */
export async function getPendingSyncDates(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((d) => typeof d === 'string') : [];
  } catch (e) {
    console.log('Error reading pending step syncs:', e);
    return [];
  }
}

async function setPendingSyncDates(dates: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(dates));
  } catch (e) {
    console.log('Error saving pending step syncs:', e);
  }
}

async function markDayPendingSync(dateKey: string): Promise<void> {
  const pending = await getPendingSyncDates();
  if (!pending.includes(dateKey)) {
    await setPendingSyncDates([...pending, dateKey]);
  }
}

async function clearDayPendingSync(dateKey: string): Promise<void> {
  const pending = await getPendingSyncDates();
  if (pending.includes(dateKey)) {
    await setPendingSyncDates(pending.filter((d) => d !== dateKey));
  }
}

/**
 * Upsert one day into the Supabase `daily_steps` table.
 *
 * The upsert is keyed by (user_id, date), so retrying it is idempotent —
 * it can never create a duplicate row. Returns true on success. On
 * failure the day is added to the persisted pending-sync queue (see
 * `flushPendingDaySyncs`) instead of being silently dropped; failures are
 * still swallowed so step tracking never breaks because of the network.
 */
export async function syncDayToSupabase(
  userId: string,
  dateKey: string,
  steps: number
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('daily_steps').upsert(
      {
        user_id: userId,
        date: dateKey,
        steps,
        distance_km: stepsToDistanceKm(steps),
        calories: stepsToCalories(steps),
        points_earned: stepsToPoints(steps),
        goal_reached: steps >= DAILY_STEP_GOAL,
      },
      { onConflict: 'user_id,date' }
    );
    if (error) {
      console.log('Error syncing daily steps:', error.message);
      await markDayPendingSync(dateKey);
      return false;
    }
    await clearDayPendingSync(dateKey);
    // Attach the day's anti-cheat flags for server review. Flag sync is
    // best-effort: it must never fail the day sync itself (the
    // `step_flags` table only exists once the owner has re-run
    // supabase/schema.sql), so its result is deliberately ignored here.
    await syncStepFlags(userId, dateKey).catch(() => 0);
    return true;
  } catch (e) {
    console.log('Error syncing daily steps:', e);
    await markDayPendingSync(dateKey);
    return false;
  }
}

/**
 * Retry every queued day sync with the day's current local total.
 * Called on app start, sign-in and foreground. Returns how many days
 * were successfully synced.
 */
export async function flushPendingDaySyncs(userId: string): Promise<number> {
  const pending = await getPendingSyncDates();
  let synced = 0;
  for (const dateKey of pending) {
    const steps = await getDaySteps(dateKey);
    if (await syncDayToSupabase(userId, dateKey, steps)) synced += 1;
  }
  // Also retry any anti-cheat flags that never reached the server.
  await flushPendingStepFlags(userId).catch(() => 0);
  return synced;
}

/**
 * Upsert locally stored anti-cheat flags (lib/antiCheat.ts) into the
 * Supabase `step_flags` table for server review. The upsert is keyed by
 * (user_id, client_id) — client_id is the flag's own id — so retries
 * can never duplicate a row. Flags are marked synced only after the
 * server accepts them. Returns how many flags were synced.
 *
 * Failures are swallowed (offline, or the table does not exist yet
 * because the owner has not re-run schema.sql): the flags stay queued
 * locally and are retried by the next day sync / flush.
 */
export async function syncStepFlags(userId: string, dateKey?: string): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const flags = await getUnsyncedStepFlags(dateKey);
  if (flags.length === 0) return 0;
  let synced = 0;
  for (const flag of flags) {
    try {
      const { error } = await supabase.from('step_flags').upsert(
        {
          user_id: userId,
          date: flag.date,
          reason: flag.reason,
          reported_steps: flag.reportedSteps,
          credited_steps: flag.creditedSteps,
          flagged_steps: flag.flaggedSteps,
          client_id: flag.id,
          created_at: flag.createdAt,
        },
        { onConflict: 'user_id,client_id' }
      );
      if (error) {
        console.log('Error syncing step flag:', error.message);
        continue;
      }
      await markStepFlagsSynced([flag.id]);
      synced += 1;
    } catch (e) {
      console.log('Error syncing step flag:', e);
    }
  }
  return synced;
}

/** Retry every unsynced anti-cheat flag, across all dates. */
export async function flushPendingStepFlags(userId: string): Promise<number> {
  return syncStepFlags(userId);
}

/**
 * Fetch the last `days` days from Supabase for a signed-in user.
 * Returns an empty map when offline / not configured / on error.
 */
export async function fetchRemoteHistory(
  userId: string,
  days: number
): Promise<Record<string, number>> {
  if (!isSupabaseConfigured) return {};
  try {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    const { data, error } = await supabase
      .from('daily_steps')
      .select('date, steps')
      .eq('user_id', userId)
      .gte('date', toDateKey(since))
      .order('date', { ascending: true });
    if (error || !data) {
      if (error) console.log('Error fetching remote history:', error.message);
      return {};
    }
    const map: Record<string, number> = {};
    for (const row of data as { date: string; steps: number }[]) {
      map[row.date] = row.steps;
    }
    return map;
  } catch (e) {
    console.log('Error fetching remote history:', e);
    return {};
  }
}

/**
 * Merge local history with remote history for display: for each day the
 * higher step count wins (the sensor is authoritative on this device, the
 * server may hold days recorded on another device).
 */
export async function getMergedHistoryRange(
  days: number,
  userId?: string | null
): Promise<DayRecord[]> {
  const local = await getHistoryRange(days);
  if (!userId) return local;
  const remote = await fetchRemoteHistory(userId, days);
  if (Object.keys(remote).length === 0) return local;
  return local.map((record) => {
    const remoteSteps = remote[record.date];
    return remoteSteps !== undefined && remoteSteps > record.steps
      ? toRecord(record.date, remoteSteps)
      : record;
  });
}
