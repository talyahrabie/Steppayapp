import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import {
  createRedemptionRecord,
  getRedemptions,
  recordRedemption,
  saveRedemptionLocal,
  syncPendingRedemptions,
  syncRedemption,
} from '../redemptions';
import { tryAppendSpend } from '../pointsLedger';
import { createLedgerEntry } from '../pointsLedger';

jest.mock('../supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { from: jest.fn() },
}));

const mockUpsert = jest.fn();
const USER_ID = 'user-123';
const REWARD = { id: 'r2', title: '20% Off Starbucks', cost: 1500 };

const upsertSucceeds = () => mockUpsert.mockResolvedValue({ error: null });
const upsertFails = () =>
  mockUpsert.mockResolvedValue({ error: { message: 'network unavailable' } });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  (supabase.from as jest.Mock).mockReturnValue({ upsert: mockUpsert });
  upsertSucceeds();
});

describe('createRedemptionRecord', () => {
  it('mints a pending record with a unique idempotency id', () => {
    const a = createRedemptionRecord(REWARD);
    const b = createRedemptionRecord(REWARD);
    expect(a.id).not.toBe(b.id);
    expect(a.syncStatus).toBe('pending');
    expect(a.rewardId).toBe('r2');
    expect(a.pointsSpent).toBe(1500);
  });
});

describe('saveRedemptionLocal', () => {
  it('is idempotent: saving the same record twice stores it once', async () => {
    const record = createRedemptionRecord(REWARD);
    await saveRedemptionLocal(record);
    await saveRedemptionLocal(record);
    const all = await getRedemptions();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(record.id);
  });
});

describe('offline redemption queues and later syncs without double-deduct', () => {
  it('keeps the record pending offline, syncs on retry, and never re-inserts', async () => {
    // 1) Offline: the redemption is created and saved locally as pending.
    upsertFails();
    const record = createRedemptionRecord(REWARD);
    await saveRedemptionLocal(record);
    expect(await syncRedemption(record, USER_ID)).toBe(false);
    let stored = await getRedemptions();
    expect(stored).toHaveLength(1);
    expect(stored[0].syncStatus).toBe('pending');

    // 2) Back online: the pending queue flush confirms it exactly once,
    //    sending the SAME client_id so the server upsert is idempotent.
    upsertSucceeds();
    const syncedCount = await syncPendingRedemptions(USER_ID);
    expect(syncedCount).toBe(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: record.id, user_id: USER_ID }),
      expect.objectContaining({ onConflict: 'user_id,client_id' })
    );
    stored = await getRedemptions();
    expect(stored[0].syncStatus).toBe('synced');

    // 3) A later retry finds nothing pending and performs no insert.
    mockUpsert.mockClear();
    expect(await syncPendingRedemptions(USER_ID)).toBe(0);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(await getRedemptions()).toHaveLength(1);
  });

  it('a double redemption attempt deducts once (ledger ref guard)', () => {
    // Mirrors the Rewards screen flow: one record id per redemption,
    // spendPoints is tryAppendSpend tagged with that id.
    const record = createRedemptionRecord({ id: 'r5', title: 'Free Meal', cost: 800 });
    const ledger = [
      createLedgerEntry('earn', 1000, 'steps', 'e-1', '2026-11-26T08:00:00.000Z'),
    ];
    const afterFirst = tryAppendSpend(ledger, record.pointsSpent, record.id, 's-1');
    expect(afterFirst).not.toBeNull();

    // Double-tap / retry path calls spend again with the same record id.
    const afterSecond = tryAppendSpend(afterFirst!, record.pointsSpent, record.id, 's-2');
    expect(afterSecond).toBeNull();

    const spends = afterFirst!.filter((e) => e.type === 'spend');
    expect(spends).toHaveLength(1);
    expect(spends[0].points).toBe(800);
  });
});

describe('recordRedemption (wrapper)', () => {
  it('creates, saves and syncs a record in one call', async () => {
    const record = await recordRedemption(REWARD, USER_ID);
    expect(record.syncStatus).toBe('pending'); // local copy pre-sync
    const stored = await getRedemptions();
    expect(stored).toHaveLength(1);
    expect(stored[0].syncStatus).toBe('synced'); // flipped after confirmed upsert
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('without a signed-in user the record stays local and pending', async () => {
    const record = await recordRedemption(REWARD, null);
    expect(record.syncStatus).toBe('pending');
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(await getRedemptions()).toHaveLength(1);
  });
});
