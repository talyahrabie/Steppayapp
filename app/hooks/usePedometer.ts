import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer } from 'expo-sensors';
import { useApp } from '../context/AppContext';
import { supabase } from '../../lib/supabase';
import {
  stepsToCalories,
  stepsToDistanceKm,
  stepsToPoints,
  toDateKey,
  todayKey,
} from '../../lib/config';
import {
  applySensorCatchUp,
  computeWatchDelta,
  endOfDayKey,
  isDayRollover,
  startOfDayKey,
} from '../../lib/stepEngine';
import {
  flushPendingDaySyncs,
  getDaySteps,
  recordDaySteps,
  syncDayToSupabase,
} from '../../lib/stepHistory';

interface PedometerData {
  /** Steps taken today. */
  steps: number;
  distance: number;
  calories: number;
  /** Points earned from today's steps (single global rate, lib/config). */
  points: number;
  isAvailable: boolean;
  isPedometerAvailable: boolean;
}

const SYNC_INTERVAL_MS = 60_000;

/**
 * AsyncStorage key for the last watch cumulative reading:
 * `{ date: 'YYYY-MM-DD', cumulative: number }`. Persisted so an app
 * restart mid-day can seed the delta baseline; if the new subscription's
 * counter restarted (the normal case) the first reading is lower than
 * the stored one and computeWatchDelta treats it as a counter reset —
 * either way no steps are lost or double-counted, because the OS
 * catch-up below is the source of truth for the day total.
 */
const WATCH_STATE_KEY = 'pedometer_watch_state_v1';

interface WatchState {
  date: string;
  cumulative: number;
}

async function loadWatchState(): Promise<WatchState | null> {
  try {
    const raw = await AsyncStorage.getItem(WATCH_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.date === 'string' && typeof parsed.cumulative === 'number') {
      return parsed as WatchState;
    }
    return null;
  } catch (e) {
    console.log('Error loading pedometer watch state:', e);
    return null;
  }
}

function persistWatchState(date: string, cumulative: number): void {
  AsyncStorage.setItem(WATCH_STATE_KEY, JSON.stringify({ date, cumulative })).catch(
    (e) => console.log('Error saving pedometer watch state:', e)
  );
}

/**
 * The single step-tracking engine for the app.
 *
 * SOURCE OF TRUTH (see lib/stepEngine.ts): the OS day total from
 * `getStepCountAsync` is authoritative — it is read at init, on every
 * foreground, and at day close-out, and sets the accounted total.
 * `watchStepCount` contributes only deltas after subscription time, so
 * the two sources never double-count.
 *
 * Hardening properties:
 * - Watch deltas go through computeWatchDelta: a cumulative counter that
 *   goes backwards (device reboot / sensor restart) becomes a fresh
 *   baseline, never a negative delta.
 * - The last cumulative reading is persisted (same-day) so an app
 *   restart mid-day resumes delta counting without losing steps; the
 *   catch-up reconciles anything walked while the app was dead.
 * - Midnight rollover closes the old day with the OS-authoritative total
 *   for that day (feeding any unaccounted steps into the points engine),
 *   persists + syncs it, and starts the new day from the OS total.
 * - All sensor-event handling is serialized through one promise chain so
 *   watch events, catch-ups and rollovers can never interleave.
 * - Failed cloud syncs are queued by lib/stepHistory and retried via
 *   flushPendingDaySyncs — never silently dropped.
 * - Respects the Settings "Step Tracking" toggle. If the sensor is
 *   unavailable it reports 0 steps and an unavailable state — there is
 *   deliberately NO simulated/fake step fallback.
 */
export const usePedometer = () => {
  const { addSteps, stepTracking, autoSync } = useApp();

  const [data, setData] = useState<PedometerData>({
    steps: 0,
    distance: 0,
    calories: 0,
    points: 0,
    isAvailable: false,
    isPedometerAvailable: false,
  });

  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const lastCumulativeRef = useRef<number | null>(null);
  const todayStepsRef = useRef(0);
  const currentDateRef = useRef(todayKey());
  const lastSyncRef = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const autoSyncRef = useRef(autoSync);
  autoSyncRef.current = autoSync;
  const addStepsRef = useRef(addSteps);
  addStepsRef.current = addSteps;
  // Serializes every async sensor operation (watch events, catch-ups,
  // rollovers) so they can never interleave and double-count.
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback((task: () => Promise<void>) => {
    chainRef.current = chainRef.current.then(task).catch((e) => {
      console.log('Pedometer task failed:', e);
    });
    return chainRef.current;
  }, []);

  const applyTodaySteps = useCallback((todaySteps: number) => {
    todayStepsRef.current = todaySteps;
    setData((prev) => ({
      ...prev,
      steps: todaySteps,
      distance: stepsToDistanceKm(todaySteps),
      calories: stepsToCalories(todaySteps),
      points: stepsToPoints(todaySteps),
    }));
    recordDaySteps(currentDateRef.current, todaySteps);
  }, []);

  const syncNow = useCallback(async (force = false) => {
    const userId = userIdRef.current;
    if (!userId || !autoSyncRef.current) return;
    const now = Date.now();
    if (!force && now - lastSyncRef.current < SYNC_INTERVAL_MS) return;
    lastSyncRef.current = now;
    await syncDayToSupabase(userId, currentDateRef.current, todayStepsRef.current);
    if (force) {
      // Also retry any earlier days whose sync previously failed.
      await flushPendingDaySyncs(userId);
    }
  }, []);

  /**
   * Close out a finished day: reconcile its total with the OS sensor's
   * authoritative count for that exact day (this recovers steps walked
   * while the app was dead), feed any unaccounted steps into the points
   * engine, persist the final total, and sync it. Days with no recorded
   * and no sensed steps are left untouched (no junk zero rows).
   */
  const closeOutDay = useCallback(async (dateKey: string, accounted: number) => {
    let finalSteps = accounted;
    try {
      const result = await Pedometer.getStepCountAsync(
        startOfDayKey(dateKey),
        endOfDayKey(dateKey)
      );
      if (result && result.steps > accounted) {
        addStepsRef.current(result.steps - accounted);
        finalSteps = result.steps;
      }
    } catch (e) {
      // Some providers cannot answer historical ranges — keep the
      // locally accounted total rather than losing the day.
      console.log('Step close-out sensor read failed:', e);
    }
    if (finalSteps <= 0 && accounted <= 0) return;
    await recordDaySteps(dateKey, finalSteps);
    if (userIdRef.current && autoSyncRef.current) {
      await syncDayToSupabase(userIdRef.current, dateKey, finalSteps);
    }
  }, []);

  /**
   * Handle midnight rollover: close out the old day, reset the watch
   * baseline (the next watch reading becomes the new baseline, so the
   * delta spanning midnight is never double-attributed — the old day was
   * closed with the OS total and the new day is seeded by catch-up),
   * and start the new day at 0. Returns true when a rollover happened.
   */
  const ensureCurrentDay = useCallback(async (): Promise<boolean> => {
    const today = todayKey();
    if (!isDayRollover(currentDateRef.current, today)) return false;
    const oldDate = currentDateRef.current;
    const oldSteps = todayStepsRef.current;
    currentDateRef.current = today;
    lastCumulativeRef.current = null;
    applyTodaySteps(0);
    await closeOutDay(oldDate, oldSteps);
    return true;
  }, [applyTodaySteps, closeOutDay]);

  /**
   * Reconcile with the OS sensor's authoritative count for today.
   * Only the not-yet-accounted difference is fed into the points engine.
   */
  const catchUpFromSensor = useCallback(async () => {
    try {
      await ensureCurrentDay();
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(start, end);
      if (!result) return;
      const { todayTotal, newSteps } = applySensorCatchUp(
        todayStepsRef.current,
        result.steps
      );
      if (newSteps > 0) {
        addStepsRef.current(newSteps);
        applyTodaySteps(todayTotal);
        syncNow();
      }
    } catch (error) {
      console.log('Error reading step count:', error);
    }
  }, [applyTodaySteps, ensureCurrentDay, syncNow]);

  /** Handle one watchStepCount reading (always run inside the chain). */
  const handleWatchReading = useCallback(
    async (cumulative: number) => {
      const rolled = await ensureCurrentDay();
      if (rolled) {
        // Seed the new day from the OS total before applying deltas.
        await catchUpFromSensor();
      }
      const { delta, baseline } = computeWatchDelta(
        lastCumulativeRef.current,
        cumulative
      );
      lastCumulativeRef.current = baseline;
      persistWatchState(currentDateRef.current, baseline);
      if (delta <= 0) return;
      addStepsRef.current(delta);
      applyTodaySteps(todayStepsRef.current + delta);
      syncNow();
    },
    [applyTodaySteps, catchUpFromSensor, ensureCurrentDay, syncNow]
  );

  useEffect(() => {
    // Track the signed-in user for cloud sync.
    supabase.auth.getSession().then(({ data: sessionData }) => {
      userIdRef.current = sessionData.session?.user?.id ?? null;
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id ?? null;
      if (session?.user) syncNow(true);
    });

    let cancelled = false;

    const init = async () => {
      // Resolve the session first so close-outs and syncs below can
      // reach the cloud when the user is signed in.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        userIdRef.current = sessionData.session?.user?.id ?? null;
      } catch (e) {
        console.log('Session read failed:', e);
      }
      if (cancelled) return;

      // If the app was dead across midnight (or all of yesterday), close
      // out yesterday now: recover its steps from the OS, persist + sync.
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = toDateKey(yesterdayDate);
      if (yesterday !== currentDateRef.current) {
        const storedYesterday = await getDaySteps(yesterday);
        if (!cancelled) await closeOutDay(yesterday, storedYesterday);
      }
      if (cancelled) return;

      // Retry any day syncs that failed in a previous session.
      if (userIdRef.current && autoSyncRef.current) {
        await flushPendingDaySyncs(userIdRef.current);
      }
      if (cancelled) return;

      // Show whatever was already recorded today (works with tracking off
      // and on sensor-less devices too — display only, never fabricated).
      const storedToday = await getDaySteps(currentDateRef.current);
      if (cancelled) return;
      if (storedToday > 0) applyTodaySteps(storedToday);

      // Seed the watch baseline from the persisted last reading (same
      // day only). A restarted counter is handled as a reset by
      // computeWatchDelta, so seeding can never double-count.
      const watchState = await loadWatchState();
      if (cancelled) return;
      if (watchState && watchState.date === currentDateRef.current) {
        lastCumulativeRef.current = watchState.cumulative;
      }

      let available = false;
      try {
        available = await Pedometer.isAvailableAsync();
      } catch (e) {
        console.log('Pedometer availability check failed:', e);
      }
      if (cancelled) return;
      setData((prev) => ({ ...prev, isAvailable: available, isPedometerAvailable: available }));

      if (!available || !stepTracking) return;

      try {
        const permission = await Pedometer.requestPermissionsAsync();
        if (permission && permission.granted === false) {
          console.log('Pedometer permission not granted');
          return;
        }
      } catch (e) {
        // Older platforms have no runtime permission — continue.
        console.log('Pedometer permission request skipped:', e);
      }
      if (cancelled) return;

      await catchUpFromSensor();
      if (cancelled) return;

      subscriptionRef.current = Pedometer.watchStepCount((result) => {
        // watchStepCount reports steps CUMULATIVE since subscription.
        // Readings are serialized through the chain so a rollover or
        // catch-up can never interleave with a delta application.
        enqueue(() => handleWatchReading(result.steps));
      });
    };

    init();

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && stepTracking) {
        // Foreground: explicit rollover check + OS reconciliation,
        // serialized with any in-flight watch readings.
        enqueue(catchUpFromSensor);
      }
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      appStateSub.remove();
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      syncNow(true);
    };
    // Re-run when the Settings toggle flips so tracking truly starts/stops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepTracking]);

  const manualSync = useCallback(async () => {
    await syncNow(true);
  }, [syncNow]);

  const refresh = useCallback(() => enqueue(catchUpFromSensor), [enqueue, catchUpFromSensor]);

  return {
    ...data,
    manualSync,
    refresh,
  };
};

export default usePedometer;
