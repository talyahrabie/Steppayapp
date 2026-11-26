import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  DAILY_STEP_GOAL,
  stepsToCalories,
  stepsToDistanceKm,
  stepsToPoints,
  toDateKey,
} from './config';

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

/**
 * Upsert one day into the Supabase `daily_steps` table.
 * Returns true on success; failures are logged and swallowed so step
 * tracking never breaks because of a network problem.
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
      return false;
    }
    return true;
  } catch (e) {
    console.log('Error syncing daily steps:', e);
    return false;
  }
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
