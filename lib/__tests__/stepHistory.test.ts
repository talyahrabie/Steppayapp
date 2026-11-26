import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import {
  flushPendingDaySyncs,
  getPendingSyncDates,
  recordDaySteps,
  syncDayToSupabase,
} from '../stepHistory';

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
