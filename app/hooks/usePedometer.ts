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
  DAILY_STEP_GOAL,
} from '../../lib/config';
import { isFirstGoalCrossingToday } from '../../lib/notificationLogic';
import {
  fireImmediateNotification,
  getNotificationPermission,
} from '../../lib/notifications';
import { trackEvent } from '../../lib/analytics';
import {
  computeWatchDelta,
  endOfDayKey,
  isDayRollover,
  mergeDailyTotals,
  startOfDayKey,
} from '../../lib/stepEngine';
import {
  fetchHealthStepsForDay,
  getHealthPermissionState,
  requestHealthPermission,
} from '../../lib/healthSync';
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
 * AsyncStorage key for the day (`YYYY-MM-DD`) the goal-reached
 * congratulation last fired for. Persisted so the congratulation (and
 * its analytics event) fires exactly once per day even across app
 * restarts — see lib/notificationLogic.ts for the decision rule.
 */
const GOAL_FIRED_KEY = 'goal_congrats_fired_date_v1';

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
 * AsyncStorage key recording that the health-platform permission prompt
 * has already been presented once from the pedometer flow. The prompt
 * is asked at most once here; afterwards the user controls health sync
 * from the Settings toggle (which re-requests on enable).
 */
const HEALTH_ASKED_KEY = 'health_permission_asked_v1';

async function loadHealthAsked(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HEALTH_ASKED_KEY)) === 'true';
  } catch (e) {
    console.log('Error loading health permission flag:', e);
    return false;
  }
}

function markHealthAsked(): void {
  AsyncStorage.setItem(HEALTH_ASKED_KEY, 'true').catch((e) =>
    console.log('Error saving health permission flag:', e)
  );
}

/**
 * The single step-tracking engine for the app.
 *
 * SOURCE OF TRUTH (see lib/stepEngine.ts): the authoritative day
 * totals are authoritative — read at init, on every foreground, and at
 * day close-out, they set the accounted total. There are two such
 * sources, merged by max (never added): the pedometer provider
 * (`getStepCountAsync`) and, when the user granted it, the health
 * platform (Apple HealthKit / Health Connect via lib/healthSync.ts),
 * which keeps counting while the app is closed and includes companion
 * devices. `watchStepCount` contributes only deltas after subscription
 * time, so no source ever double-counts. When health access is denied
 * or the native module is absent (Expo Go), the hook silently falls
 * back to the pedometer-only behaviour.
 *
 * Every credited batch passes the anti-cheat plausibility gate inside
 * AppContext.addSteps; day close-outs pass the closed day's key and
 * end-of-day timestamp so their steps are judged against that day.
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
  const {
    addSteps,
    stepTracking,
    autoSync,
    healthSync: healthSyncEnabled,
    pushNotifications,
    t,
  } = useApp();

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
  const healthSyncRef = useRef(healthSyncEnabled);
  healthSyncRef.current = healthSyncEnabled;
  /** True once health-platform read access is in effect this session. */
  const healthGrantedRef = useRef(false);
  const addStepsRef = useRef(addSteps);
  addStepsRef.current = addSteps;
  const pushEnabledRef = useRef(pushNotifications);
  pushEnabledRef.current = pushNotifications;
  const tRef = useRef(t);
  tRef.current = t;
  /** Day key the goal congratulation already fired for (this session). */
  const goalFiredMemRef = useRef<string | null>(null);
  // Serializes every async sensor operation (watch events, catch-ups,
  // rollovers) so they can never interleave and double-count.
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback((task: () => Promise<void>) => {
    chainRef.current = chainRef.current.then(task).catch((e) => {
      console.log('Pedometer task failed:', e);
    });
    return chainRef.current;
  }, []);

  /**
   * Goal-reached celebration, driven from the crediting path: every
   * credited update of today's total flows through applyTodaySteps, so
   * the first time the total reaches DAILY_STEP_GOAL we (a) record the
   * `steps_goal_reached` analytics event and (b) fire ONE local
   * congratulation notification when the user has notifications on.
   * The fired day is persisted (plus an in-memory guard), so this can
   * never spam — at most once per day, however often steps update.
   */
  const maybeCelebrateGoal = useCallback(async (todaySteps: number) => {
    const today = currentDateRef.current;
    if (goalFiredMemRef.current === today) return;
    try {
      const stored = await AsyncStorage.getItem(GOAL_FIRED_KEY);
      const crossing = isFirstGoalCrossingToday({
        todaySteps,
        goal: DAILY_STEP_GOAL,
        lastFiredDateKey: stored ?? goalFiredMemRef.current,
        today,
      });
      if (!crossing) return;
      // Claim the day synchronously before any further awaits.
      goalFiredMemRef.current = today;
      await AsyncStorage.setItem(GOAL_FIRED_KEY, today).catch(() => {});
      trackEvent('steps_goal_reached', { steps: todaySteps });
      if (pushEnabledRef.current && (await getNotificationPermission())) {
        await fireImmediateNotification({
          title: tRef.current('notif_goal_title'),
          body: tRef.current('notif_goal_body'),
        });
      }
    } catch (e) {
      console.log('Goal celebration failed:', e);
    }
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
    void maybeCelebrateGoal(todaySteps);
  }, [maybeCelebrateGoal]);

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
   * Health-platform total for a day, or null when health sync is off,
   * not granted, or the platform cannot answer. Health is the primary
   * source when granted: it counts while the app is closed and includes
   * companion devices, so it can exceed the pedometer provider's total.
   */
  const fetchHealthTotal = useCallback(async (dateKey: string): Promise<number | null> => {
    if (!healthSyncRef.current || !healthGrantedRef.current) return null;
    return fetchHealthStepsForDay(dateKey);
  }, []);

  /**
   * Resolve health-platform access for this session: already granted →
   * true; never asked → present the platform prompt ONCE (part of the
   * pedometer permission flow) and remember that we asked; denied or
   * unavailable → false, and the engine silently stays pedometer-only.
   */
  const ensureHealthPermission = useCallback(async (): Promise<boolean> => {
    if (!healthSyncRef.current) return false;
    const state = await getHealthPermissionState();
    if (state === 'granted') return true;
    if (state === 'unavailable') return false;
    if (await loadHealthAsked()) return false;
    const granted = await requestHealthPermission();
    markHealthAsked();
    return granted;
  }, []);

  /**
   * Close out a finished day: reconcile its total with the authoritative
   * counts for that exact day — the pedometer provider AND the health
   * platform (this recovers steps walked while the app was dead, on
   * either source) — feed any unaccounted steps into the points engine
   * attributed to the closed day, persist the final total, and sync it.
   * Days with no recorded and no sensed steps are left untouched (no
   * junk zero rows).
   */
  const closeOutDay = useCallback(async (dateKey: string, accounted: number) => {
    let sensorTotal: number | null = null;
    try {
      const result = await Pedometer.getStepCountAsync(
        startOfDayKey(dateKey),
        endOfDayKey(dateKey)
      );
      if (result) sensorTotal = result.steps;
    } catch (e) {
      // Some providers cannot answer historical ranges — the health
      // total (or the locally accounted total) still closes the day.
      console.log('Step close-out sensor read failed:', e);
    }
    const healthTotal = await fetchHealthTotal(dateKey);
    const { todayTotal, newSteps } = mergeDailyTotals(accounted, [sensorTotal, healthTotal]);
    if (newSteps > 0) {
      addStepsRef.current(newSteps, {
        dateKey,
        atMs: endOfDayKey(dateKey).getTime(),
      });
    }
    const finalSteps = todayTotal;
    if (finalSteps <= 0 && accounted <= 0) return;
    await recordDaySteps(dateKey, finalSteps);
    if (userIdRef.current && autoSyncRef.current) {
      await syncDayToSupabase(userIdRef.current, dateKey, finalSteps);
    }
  }, [fetchHealthTotal]);

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
   * Reconcile with the authoritative counts for today — pedometer
   * provider and health platform merged by max (never added, so the
   * same steps can never count twice). Only the not-yet-accounted
   * difference is fed into the points engine.
   */
  const catchUpFromSensor = useCallback(async () => {
    try {
      await ensureCurrentDay();
      let pedometerTotal: number | null = null;
      try {
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(start, end);
        if (result) pedometerTotal = result.steps;
      } catch (error) {
        console.log('Error reading step count:', error);
      }
      const healthTotal = await fetchHealthTotal(currentDateRef.current);
      if (pedometerTotal === null && healthTotal === null) return;
      const { todayTotal, newSteps } = mergeDailyTotals(
        todayStepsRef.current,
        [pedometerTotal, healthTotal]
      );
      if (newSteps > 0) {
        addStepsRef.current(newSteps);
        applyTodaySteps(todayTotal);
        syncNow();
      }
    } catch (error) {
      console.log('Error reconciling step counts:', error);
    }
  }, [applyTodaySteps, ensureCurrentDay, fetchHealthTotal, syncNow]);

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

      // Resolve health-platform access BEFORE any close-out or catch-up
      // so yesterday's close-out and today's first reconciliation can
      // already use health totals (steps walked while the app was
      // dead). This is the one place the health prompt is presented
      // from the tracking flow; Settings can re-request at any time.
      // Skipped entirely when step tracking itself is off.
      healthGrantedRef.current = stepTracking ? await ensureHealthPermission() : false;
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
      setData((prev) => ({
        ...prev,
        // Health totals alone can drive the counter (e.g. a watch-only
        // user), so "available" is true when either source works.
        isAvailable: available || healthGrantedRef.current,
        isPedometerAvailable: available,
      }));

      if (!stepTracking) return;

      let pedometerGranted = false;
      if (available) {
        try {
          const permission = await Pedometer.requestPermissionsAsync();
          if (permission && permission.granted === false) {
            console.log('Pedometer permission not granted');
          } else {
            pedometerGranted = true;
          }
        } catch (e) {
          // Older platforms have no runtime permission — continue.
          console.log('Pedometer permission request skipped:', e);
          pedometerGranted = true;
        }
      }
      if (cancelled) return;

      await catchUpFromSensor();
      if (cancelled) return;

      // Without a usable pedometer provider there is no live watch;
      // health-only mode still reconciles on every foreground via the
      // AppState listener below.
      if (!available || !pedometerGranted) return;

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
    // Re-run when the Settings toggles flip so tracking truly
    // starts/stops and health sync re-resolves its permission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepTracking, healthSyncEnabled]);

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
