import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import {
  flushPendingDaySyncs,
  getPendingSyncDates,
  recordDaySteps,
  syncDayToSupabase,
} from '../stepHistory';
import {
  appendStepFlags,
  emptyAntiCheatState,
  getUnsyncedStepFlags,
  validateStepCredit,
} from '../antiCheat';
import { startOfDayKey } from '../stepEngine';

jest.mock('../supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { from: jest.fn() },
}));

const mockUpsert = jest.fn();
const USER_ID = 'user-123';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  (supabase.from as jest.Mock).mockReturnValue({ upsert: mockUpsert });
  mockUpsert.mockResolvedValue({ error: null });
});

describe('syncDayToSupabase pending queue', () => {
  it('a successful upsert leaves the pending queue empty', async () => {
    expect(await syncDayToSupabase(USER_ID, '2026-11-25', 8000)).toBe(true);
    expect(await getPendingSyncDates()).toEqual([]);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, date: '2026-11-25', steps: 8000 }),
      expect.objectContaining({ onConflict: 'user_id,date' })
    );
  });

  it('a failed upsert is queued, never silently dropped', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'offline' } });
    expect(await syncDayToSupabase(USER_ID, '2026-11-25', 8000)).toBe(false);
    expect(await getPendingSyncDates()).toEqual(['2026-11-25']);
  });

  it('flush retries queued days with their current local totals', async () => {
    // Day recorded locally; sync fails (offline) → queued.
    await recordDaySteps('2026-11-25', 7000);
    mockUpsert.mockResolvedValue({ error: { message: 'offline' } });
    await syncDayToSupabase(USER_ID, '2026-11-25', 7000);
    expect(await getPendingSyncDates()).toEqual(['2026-11-25']);

    // The day total grows before connectivity returns (idempotent upsert
    // must send the LATEST total, keyed by user_id+date).
    await recordDaySteps('2026-11-25', 7500);
    mockUpsert.mockResolvedValue({ error: null });
    expect(await flushPendingDaySyncs(USER_ID)).toBe(1);
    expect(mockUpsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ date: '2026-11-25', steps: 7500 }),
      expect.objectContaining({ onConflict: 'user_id,date' })
    );
    expect(await getPendingSyncDates()).toEqual([]);
  });

  it('flush keeps still-failing days queued for the next retry', async () => {
    await recordDaySteps('2026-11-25', 7000);
    mockUpsert.mockResolvedValue({ error: { message: 'offline' } });
    await syncDayToSupabase(USER_ID, '2026-11-25', 7000);
    expect(await flushPendingDaySyncs(USER_ID)).toBe(0);
    expect(await getPendingSyncDates()).toEqual(['2026-11-25']);
  });
});

describe('anti-cheat step flag sync', () => {
  it('a successful day sync also uploads the day flags and marks them synced', async () => {
    const res = validateStepCredit(
      emptyAntiCheatState(),
      { delta: 70000, dateKey: '2026-11-25', atMs: startOfDayKey('2026-11-25').getTime() + 1380 * 60000 },
      undefined,
      'flag-upload',
      '2026-11-25T23:00:00.000Z'
    );
    await appendStepFlags([res.flag!]);
    expect(await getUnsyncedStepFlags()).toHaveLength(1);

    expect(await syncDayToSupabase(USER_ID, '2026-11-25', 60000)).toBe(true);

    // The flag row went up keyed for idempotent retries…
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        date: '2026-11-25',
        reason: 'day_cap_exceeded',
        flagged_steps: 10000,
        client_id: 'flag-upload',
      }),
      expect.objectContaining({ onConflict: 'user_id,client_id' })
    );
    // …and is marked synced locally so it is never sent twice.
    expect(await getUnsyncedStepFlags()).toHaveLength(0);
  });

  it('a failing flag upload never fails the day sync and stays queued', async () => {
    const res = validateStepCredit(
      emptyAntiCheatState(),
      { delta: 70000, dateKey: '2026-11-25', atMs: startOfDayKey('2026-11-25').getTime() + 1380 * 60000 },
      undefined,
      'flag-stuck',
      '2026-11-25T23:00:00.000Z'
    );
    await appendStepFlags([res.flag!]);

    // Day upsert succeeds; flag upsert fails (e.g. step_flags table not
    // created yet because schema.sql has not been re-run).
    mockUpsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValue({ error: { message: 'relation "step_flags" does not exist' } });

    expect(await syncDayToSupabase(USER_ID, '2026-11-25', 60000)).toBe(true);
    expect(await getPendingSyncDates()).toEqual([]);
    expect(await getUnsyncedStepFlags()).toHaveLength(1);
  });
});
