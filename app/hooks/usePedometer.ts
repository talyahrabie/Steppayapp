import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useApp } from '../context/AppContext';
import { supabase } from '../../lib/supabase';
import {
  stepsToCalories,
  stepsToDistanceKm,
  stepsToPoints,
  todayKey,
} from '../../lib/config';
import {
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
 * The single step-tracking engine for the app.
 *
 * - Reads today's authoritative total from the OS sensor and then applies
 *   only DELTAS from `watchStepCount` (the watch API reports a cumulative
 *   count since subscription — adding it wholesale double-counts, which was
 *   the old bug).
 * - Feeds every new step into AppContext.addSteps so points/XP/achievements
 *   actually move.
 * - Persists today's total to the local history store and (when signed in
 *   and auto-sync is on) upserts it to the `daily_steps` table.
 * - Respects the Settings "Step Tracking" toggle: when off, no sensor
 *   subscription is created at all.
 * - If the sensor is unavailable it reports 0 steps and an unavailable
 *   state. There is deliberately NO simulated/fake step fallback anymore.
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
  }, []);

  /** Handle midnight rollover: close out yesterday, start today at 0. */
  const ensureCurrentDay = useCallback(async () => {
    const today = todayKey();
    if (today === currentDateRef.current) return;
    const oldDate = currentDateRef.current;
    const oldSteps = todayStepsRef.current;
    currentDateRef.current = today;
    lastCumulativeRef.current = null;
    applyTodaySteps(0);
    if (userIdRef.current && autoSyncRef.current) {
      await syncDayToSupabase(userIdRef.current, oldDate, oldSteps);
    }
  }, [applyTodaySteps]);

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
      const accounted = todayStepsRef.current;
      const todayTotal = Math.max(accounted, result.steps);
      if (todayTotal > accounted) {
        addStepsRef.current(todayTotal - accounted);
        applyTodaySteps(todayTotal);
        syncNow();
      }
    } catch (error) {
      console.log('Error reading step count:', error);
    }
  }, [applyTodaySteps, ensureCurrentDay, syncNow]);

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
      // Show whatever was already recorded today (works with tracking off
      // and on sensor-less devices too — display only, never fabricated).
      const storedToday = await getDaySteps(currentDateRef.current);
      if (cancelled) return;
      if (storedToday > 0) applyTodaySteps(storedToday);

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
        // Only the difference since the previous event is new.
        if (lastCumulativeRef.current === null) {
          lastCumulativeRef.current = result.steps;
          return;
        }
        const delta = result.steps - lastCumulativeRef.current;
        if (delta <= 0) return;
        lastCumulativeRef.current = result.steps;

        (async () => {
          // If midnight passed, this resets today's total to 0 first,
          // so the plain addition below is correct in both cases.
          await ensureCurrentDay();
          addStepsRef.current(delta);
          applyTodaySteps(todayStepsRef.current + delta);
          syncNow();
        })();
      });
    };

    init();

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && stepTracking) {
        catchUpFromSensor();
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

  return {
    ...data,
    manualSync,
    refresh: catchUpFromSensor,
  };
};

export default usePedometer;
