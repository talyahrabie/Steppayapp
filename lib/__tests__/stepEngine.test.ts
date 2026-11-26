import {
  applySensorCatchUp,
  computeWatchDelta,
  endOfDayKey,
  isDayRollover,
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
