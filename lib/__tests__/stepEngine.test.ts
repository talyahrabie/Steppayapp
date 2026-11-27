import {
  applySensorCatchUp,
  computeWatchDelta,
  endOfDayKey,
  isDayRollover,
  mergeDailyTotals,
  resolvePrimarySource,
  startOfDayKey,
} from '../stepEngine';

describe('computeWatchDelta — normal case', () => {
  it('first reading only establishes the baseline (delta 0)', () => {
    expect(computeWatchDelta(null, 0)).toEqual({ delta: 0, baseline: 0, reset: false });
    expect(computeWatchDelta(null, 250)).toEqual({ delta: 0, baseline: 250, reset: false });
  });

  it('returns the difference between consecutive cumulative readings', () => {
    expect(computeWatchDelta(1000, 1250)).toEqual({ delta: 250, baseline: 1250, reset: false });
    expect(computeWatchDelta(1250, 1250)).toEqual({ delta: 0, baseline: 1250, reset: false });
  });

  it('accumulates a realistic reading sequence without loss', () => {
    const readings = [0, 120, 450, 451, 2000];
    let baseline: number | null = null;
    let total = 0;
    for (const r of readings) {
      const res = computeWatchDelta(baseline, r);
      baseline = res.baseline;
      total += res.delta;
    }
    expect(total).toBe(2000);
  });
});

describe('computeWatchDelta — cumulative counter reset (reboot / sensor restart)', () => {
  it('a lower cumulative becomes a fresh baseline, never a negative delta', () => {
    const res = computeWatchDelta(5000, 30);
    expect(res.reset).toBe(true);
    expect(res.delta).toBe(0);
    expect(res.baseline).toBe(30);
  });

  it('counting resumes correctly from the post-reset baseline', () => {
    const reset = computeWatchDelta(5000, 30);
    const next = computeWatchDelta(reset.baseline, 130);
    expect(next).toEqual({ delta: 100, baseline: 130, reset: false });
  });

  it('never produces a negative delta for any input pair', () => {
    const pairs: Array<[number | null, number]> = [
      [null, -5],
      [10, 0],
      [99999, 1],
      [0, 0],
      [5, -100],
    ];
    for (const [prev, next] of pairs) {
      expect(computeWatchDelta(prev, next).delta).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('applySensorCatchUp — restart recovery', () => {
  it('feeds only the not-yet-accounted difference into the engine', () => {
    // App accounted 5,000 steps via watch deltas, was killed, the user
    // walked 300 more, the OS now reports 5,300 for today.
    expect(applySensorCatchUp(5000, 5300)).toEqual({ todayTotal: 5300, newSteps: 300 });
  });

  it('never lowers the accounted total when the sensor reports less', () => {
    expect(applySensorCatchUp(5000, 4200)).toEqual({ todayTotal: 5000, newSteps: 0 });
    expect(applySensorCatchUp(5000, 5000)).toEqual({ todayTotal: 5000, newSteps: 0 });
  });

  it('full restart scenario: reset + catch-up neither loses nor double-counts', () => {
    // Session 1: watch deltas account for 5,000 steps; baseline persisted.
    let accounted = 5000;
    const persistedBaseline = 5000;

    // App restarts: new subscription counter starts near 0 → reset.
    const first = computeWatchDelta(persistedBaseline, 30);
    expect(first.reset).toBe(true);
    accounted += first.delta; // +0

    // Catch-up reconciles against the OS total (300 steps walked meanwhile).
    const catchUp = applySensorCatchUp(accounted, 5300);
    accounted = catchUp.todayTotal;
    expect(catchUp.newSteps).toBe(300);

    // Subsequent watch deltas add only genuinely new steps.
    const next = computeWatchDelta(first.baseline, 130);
    accounted += next.delta;

    expect(accounted).toBe(5400);
  });
});

describe('midnight rollover attribution', () => {
  it('detects a day change and only a day change', () => {
    expect(isDayRollover('2026-11-25', '2026-11-26')).toBe(true);
    expect(isDayRollover('2026-11-26', '2026-11-26')).toBe(false);
  });

  it('close-out range covers exactly the old day', () => {
    const start = startOfDayKey('2026-11-25');
    const end = endOfDayKey('2026-11-25');
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(start.getDate()).toBe(25);
    expect(end.getDate()).toBe(25);
  });

  it('steps land on the correct day across midnight (hook algorithm simulation)', () => {
    // Mirrors usePedometer.handleWatchReading using the pure functions:
    // deltas before midnight → old day; at rollover the baseline resets
    // (first new-day reading is a baseline, its steps come from the OS
    // catch-up); later deltas → new day.
    let currentDay = '2026-11-25';
    let baseline: number | null = null;
    const perDay: Record<string, number> = { '2026-11-25': 0, '2026-11-26': 0 };

    const onReading = (cumulative: number, nowKey: string) => {
      if (isDayRollover(currentDay, nowKey)) {
        currentDay = nowKey;
        baseline = null; // reset by ensureCurrentDay
        // New day seeded by OS catch-up: sensor says 20 steps since midnight.
        const seed = applySensorCatchUp(perDay[currentDay], 20);
        perDay[currentDay] = seed.todayTotal;
      }
      const { delta, baseline: newBaseline } = computeWatchDelta(baseline, cumulative);
      baseline = newBaseline;
      perDay[currentDay] += delta;
    };

    onReading(0, '2026-11-25'); // subscription baseline
    onReading(4800, '2026-11-25'); // evening walk
    onReading(5000, '2026-11-25'); // last reading before midnight
    onReading(5050, '2026-11-26'); // first reading after midnight (spanning delta dropped)
    onReading(5150, '2026-11-26'); // morning steps

    expect(perDay['2026-11-25']).toBe(5000);
    // 20 from the OS catch-up seed + 100 of post-baseline deltas.
    expect(perDay['2026-11-26']).toBe(120);
  });
});

describe('mergeDailyTotals — health platform as a second authoritative source', () => {
  it('health total higher than the pedometer total credits the difference exactly once', () => {
    // Watch deltas accounted 5,000; pedometer provider says 5,300;
    // Health Connect (which also saw the user's watch) says 6,800.
    const first = mergeDailyTotals(5000, [5300, 6800]);
    expect(first).toEqual({ todayTotal: 6800, newSteps: 1800 });

    // The accounted total is now the health total, so re-running the
    // same merge (next foreground) credits nothing more — no double
    // counting of the health catch-up.
    const second = mergeDailyTotals(first.todayTotal, [5300, 6800]);
    expect(second).toEqual({ todayTotal: 6800, newSteps: 0 });
  });

  it('health total lower than accounted never credits a negative amount', () => {
    // Health only has partial data (e.g. phone-only, no watch sync yet).
    expect(mergeDailyTotals(6800, [5300, 4000])).toEqual({
      todayTotal: 6800,
      newSteps: 0,
    });
    expect(mergeDailyTotals(6800, [null, 4000])).toEqual({
      todayTotal: 6800,
      newSteps: 0,
    });
  });

  it('ignores sources that cannot answer (null/undefined)', () => {
    expect(mergeDailyTotals(2000, [null, undefined])).toEqual({
      todayTotal: 2000,
      newSteps: 0,
    });
    expect(mergeDailyTotals(2000, [null, 2600])).toEqual({
      todayTotal: 2600,
      newSteps: 600,
    });
  });

  it('recovers a full day walked while the app was dead, from health alone', () => {
    // App never ran today; the health platform counted everything.
    expect(mergeDailyTotals(0, [null, 12345])).toEqual({
      todayTotal: 12345,
      newSteps: 12345,
    });
  });

  it('day rollover with a health source: each day merges against its own total', () => {
    // Mirrors the hook: `accounted` is per-day state, reset at rollover;
    // close-out merges the old day, the new day starts from zero and
    // merges against the NEW day's (small) health total — yesterday's
    // health total must not leak into today.
    const day1 = mergeDailyTotals(0, [8200, 9000]); // health saw the watch too
    expect(day1).toEqual({ todayTotal: 9000, newSteps: 9000 });

    const day2 = mergeDailyTotals(0, [150, 300]);
    expect(day2).toEqual({ todayTotal: 300, newSteps: 300 });

    // A late re-merge of day 1 (close-out retry) is unaffected by day 2.
    const day1Again = mergeDailyTotals(day1.todayTotal, [8200, 9000]);
    expect(day1Again).toEqual({ todayTotal: 9000, newSteps: 0 });
  });
});

describe('resolvePrimarySource — permission-denied fallback', () => {
  it('prefers health when it is available and granted', () => {
    expect(resolvePrimarySource({ available: true, granted: true }, true)).toBe('health');
    expect(resolvePrimarySource({ available: true, granted: true }, false)).toBe('health');
  });

  it('falls back to the pedometer when health permission is denied', () => {
    expect(resolvePrimarySource({ available: true, granted: false }, true)).toBe('pedometer');
  });

  it('falls back to the pedometer when the health module is absent (Expo Go)', () => {
    expect(resolvePrimarySource({ available: false, granted: false }, true)).toBe('pedometer');
  });

  it('returns null when neither source can provide totals', () => {
    expect(resolvePrimarySource({ available: false, granted: false }, false)).toBeNull();
    expect(resolvePrimarySource({ available: true, granted: false }, false)).toBeNull();
  });
});
