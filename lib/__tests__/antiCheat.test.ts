import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AntiCheatState,
  appendStepFlags,
  emptyAntiCheatState,
  getStepFlagsForDate,
  getUnsyncedStepFlags,
  loadAntiCheatState,
  loadStepFlags,
  markStepFlagsSynced,
  persistAntiCheatState,
  validateStepCredit,
} from '../antiCheat';
import { endOfDayKey, startOfDayKey } from '../stepEngine';

// Fixed day for every scenario; timestamps are minutes after its local
// midnight so the rate ceiling is fully deterministic.
const DAY = '2026-11-26';
const YESTERDAY = '2026-11-25';
const atMinute = (dateKey: string, minutes: number): number =>
  startOfDayKey(dateKey).getTime() + minutes * 60000;

const validate = (
  state: AntiCheatState,
  delta: number,
  dateKey: string,
  atMs: number,
  flagId = 'flag-test'
) => validateStepCredit(state, { delta, dateKey, atMs }, undefined, flagId, '2026-11-26T00:00:00.000Z');

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('validateStepCredit — legitimate activity', () => {
  it('credits a normal day in full, across several batches', () => {
    let state = emptyAntiCheatState();
    let totalCredited = 0;
    const batches: Array<[number, number]> = [
      [480, 3000], // 08:00 morning walk
      [750, 4500], // 12:30 lunch walk
      [1140, 4000], // 19:00 evening walk
    ];
    for (const [minute, delta] of batches) {
      const res = validate(state, delta, DAY, atMinute(DAY, minute));
      expect(res.flag).toBeNull();
      expect(res.flaggedSteps).toBe(0);
      totalCredited += res.creditedSteps;
      state = res.state;
    }
    expect(totalCredited).toBe(11500);
    expect(state.creditedByDate[DAY]).toBe(11500);
  });

  it('credits a large evening catch-up in full (app was closed all day)', () => {
    // First batch of the day arrives at 20:00 carrying the whole day's
    // 15,000 steps. The rate ceiling is backed by 1,200 elapsed minutes,
    // so nothing is withheld — honest users never lose real steps.
    const res = validate(emptyAntiCheatState(), 15000, DAY, atMinute(DAY, 1200));
    expect(res.creditedSteps).toBe(15000);
    expect(res.flaggedSteps).toBe(0);
    expect(res.flag).toBeNull();
  });

  it('credits a day close-out remainder in full (judged at end of the closed day)', () => {
    // Yesterday the app died at noon; the close-out at rollover credits
    // the remaining 9,000 steps with yesterday's end-of-day timestamp.
    const res = validate(
      emptyAntiCheatState(),
      9000,
      YESTERDAY,
      endOfDayKey(YESTERDAY).getTime()
    );
    expect(res.creditedSteps).toBe(9000);
    expect(res.flag).toBeNull();
    expect(res.state.creditedByDate[YESTERDAY]).toBe(9000);
  });

  it('treats each day independently across a rollover', () => {
    const state: AntiCheatState = { creditedByDate: { [YESTERDAY]: 59000 } };
    const res = validate(state, 5000, DAY, atMinute(DAY, 600));
    expect(res.creditedSteps).toBe(5000);
    expect(res.flag).toBeNull();
    expect(res.state.creditedByDate[DAY]).toBe(5000);
    expect(res.state.creditedByDate[YESTERDAY]).toBe(59000);
  });

  it('is a no-op for zero or negative deltas', () => {
    const state = emptyAntiCheatState();
    for (const delta of [0, -50]) {
      const res = validate(state, delta, DAY, atMinute(DAY, 600));
      expect(res.creditedSteps).toBe(0);
      expect(res.flaggedSteps).toBe(0);
      expect(res.flag).toBeNull();
      expect(res.state).toBe(state);
    }
  });

  it('never mutates the input state', () => {
    const state: AntiCheatState = { creditedByDate: { [DAY]: 1000 } };
    const snapshot = JSON.parse(JSON.stringify(state));
    validate(state, 500, DAY, atMinute(DAY, 600));
    expect(state).toEqual(snapshot);
  });
});

describe('validateStepCredit — daily cap', () => {
  it('credits an over-cap day up to the cap and flags only the excess', () => {
    const state: AntiCheatState = { creditedByDate: { [DAY]: 58000 } };
    const res = validate(state, 5000, DAY, atMinute(DAY, 1260), 'flag-cap');
    expect(res.creditedSteps).toBe(2000); // up to the 60,000 cap
    expect(res.flaggedSteps).toBe(3000);
    expect(res.state.creditedByDate[DAY]).toBe(60000);
    expect(res.flag).toMatchObject({
      id: 'flag-cap',
      date: DAY,
      reason: 'day_cap_exceeded',
      reportedSteps: 5000,
      creditedSteps: 2000,
      flaggedSteps: 3000,
      synced: false,
    });
  });

  it('caps a single impossible day total at the daily maximum', () => {
    const res = validate(emptyAntiCheatState(), 70000, DAY, atMinute(DAY, 1380));
    expect(res.creditedSteps).toBe(60000);
    expect(res.flaggedSteps).toBe(10000);
    expect(res.flag?.reason).toBe('day_cap_exceeded');
  });

  it('credits nothing further once the cap is reached, flagging each new batch', () => {
    const state: AntiCheatState = { creditedByDate: { [DAY]: 60000 } };
    const res = validate(state, 800, DAY, atMinute(DAY, 1400));
    expect(res.creditedSteps).toBe(0);
    expect(res.flaggedSteps).toBe(800);
    expect(res.flag?.reason).toBe('day_cap_exceeded');
  });
});

describe('validateStepCredit — rate ceiling', () => {
  it('rejects an impossible-rate delta and flags it', () => {
    // 20,000 steps "walked" by 00:05 — five minutes into the day. The
    // ceiling is 5 × 250 + 1,500 burst = 2,750.
    const res = validate(emptyAntiCheatState(), 20000, DAY, atMinute(DAY, 5), 'flag-rate');
    expect(res.creditedSteps).toBe(2750);
    expect(res.flaggedSteps).toBe(17250);
    expect(res.flag).toMatchObject({ id: 'flag-rate', reason: 'rate_exceeded' });
  });

  it('bounds a sustained injection to the plausible rate, however it is dripped in', () => {
    // A cheat tool injecting 1,000 steps every minute for 10 minutes:
    // total credited can never exceed burst + rate × elapsed.
    let state = emptyAntiCheatState();
    let credited = 0;
    let flagged = 0;
    for (let minute = 1; minute <= 10; minute++) {
      const res = validate(state, 1000, DAY, atMinute(DAY, minute));
      credited += res.creditedSteps;
      flagged += res.flaggedSteps;
      state = res.state;
    }
    expect(credited).toBeLessThanOrEqual(1500 + 250 * 10);
    expect(credited + flagged).toBe(10000);
    expect(flagged).toBeGreaterThan(0);
  });

  it('allows a genuine run at high cadence without flagging', () => {
    // 200 steps/min for 30 minutes, delivered as one batch per minute —
    // a fast runner stays under the 250/min ceiling throughout.
    let state = emptyAntiCheatState();
    for (let minute = 1; minute <= 30; minute++) {
      const res = validate(state, 200, DAY, atMinute(DAY, 600 + minute));
      expect(res.flag).toBeNull();
      expect(res.creditedSteps).toBe(200);
      state = res.state;
    }
    expect(state.creditedByDate[DAY]).toBe(6000);
  });
});

describe('anti-cheat storage — flags and state persist', () => {
  it('persists flags and reads them back by date and sync status', async () => {
    const res = validate(emptyAntiCheatState(), 70000, DAY, atMinute(DAY, 1380), 'flag-persist');
    expect(res.flag).not.toBeNull();
    await appendStepFlags([res.flag!]);

    const stored = await loadStepFlags();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: 'flag-persist', flaggedSteps: 10000, synced: false });

    expect(await getStepFlagsForDate(DAY)).toHaveLength(1);
    expect(await getStepFlagsForDate(YESTERDAY)).toHaveLength(0);
    expect(await getUnsyncedStepFlags()).toHaveLength(1);
    expect(await getUnsyncedStepFlags(DAY)).toHaveLength(1);
    expect(await getUnsyncedStepFlags(YESTERDAY)).toHaveLength(0);
  });

  it('marks flags synced so they are not re-sent', async () => {
    const res = validate(emptyAntiCheatState(), 70000, DAY, atMinute(DAY, 1380), 'flag-sync');
    await appendStepFlags([res.flag!]);
    await markStepFlagsSynced(['flag-sync']);
    expect(await getUnsyncedStepFlags()).toHaveLength(0);
    const stored = await loadStepFlags();
    expect(stored[0].synced).toBe(true);
  });

  it('persists and reloads the validator state', async () => {
    const res = validate(emptyAntiCheatState(), 5000, DAY, atMinute(DAY, 600));
    await persistAntiCheatState(res.state);
    const loaded = await loadAntiCheatState();
    expect(loaded.creditedByDate[DAY]).toBe(5000);
  });

  it('falls back to an empty state on corrupt storage', async () => {
    await AsyncStorage.setItem('anti_cheat_state_v1', '{not json');
    expect(await loadAntiCheatState()).toEqual({ creditedByDate: {} });
    await AsyncStorage.setItem('step_flags_v1', '{"nope":true}');
    expect(await loadStepFlags()).toEqual([]);
  });
});
