import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Reward redemptions — hardened against double-charges and lost records.
//
// Flow (orchestrated by the Rewards screen):
//   1. `createRedemptionRecord` mints a record with a client-generated
//      idempotency id BEFORE anything is deducted.
//   2. AppContext.spendPoints(cost, record.id) appends the ledger spend
//      entry tagged with that id — the ledger refuses a second spend with
//      the same id, so the points can only ever be deducted once.
//   3. `saveRedemptionLocal` stores the record locally as 'pending'.
//   4. `syncRedemption` upserts it to Supabase with `client_id = record.id`
//      (unique per user), so retrying the sync after a network failure can
//      never create a duplicate server row. On success the local record
//      flips to 'synced'; on failure it stays 'pending' and
//      `syncPendingRedemptions` retries it on the next app start / sign-in
//      / foreground — the local spend is never rolled back and never
//      re-applied.
// ─────────────────────────────────────────────────────────────────────────────

const REDEMPTIONS_KEY = 'user_redemptions';

export type RedemptionSyncStatus = 'pending' | 'synced';

export interface RedemptionRecord {
  /** Client-generated idempotency id — also sent to Supabase as client_id. */
  id: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  /** ISO timestamp of the redemption. */
  date: string;
  /** 'pending' until the Supabase upsert has been confirmed. */
  syncStatus: RedemptionSyncStatus;
}

/** Generate a client idempotency id for a redemption. */
export function createRedemptionId(): string {
  return `red-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Create a new (unsaved, unsynced) redemption record for a reward. */
export function createRedemptionRecord(reward: {
  id: string;
  title: string;
  cost: number;
}): RedemptionRecord {
  return {
    id: createRedemptionId(),
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointsSpent: reward.cost,
    date: new Date().toISOString(),
    syncStatus: 'pending',
  };
}

function normalizeRecord(raw: any): RedemptionRecord | null {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
  return {
    id: raw.id,
    rewardId: raw.rewardId,
    rewardTitle: raw.rewardTitle,
    pointsSpent: raw.pointsSpent,
    date: raw.date,
    // Records written by older builds have no syncStatus — they were
    // fire-and-forget inserts, so treat them as pending: the idempotent
    // upsert makes re-syncing them safe.
    syncStatus: raw.syncStatus === 'synced' ? 'synced' : 'pending',
  };
}

/** All locally recorded redemptions, newest first. */
export async function getRedemptions(): Promise<RedemptionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(REDEMPTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRecord)
      .filter((r): r is RedemptionRecord => r !== null);
  } catch (e) {
    console.log('Error reading redemptions:', e);
    return [];
  }
}

async function storeRedemptions(records: RedemptionRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(records));
  } catch (e) {
    console.log('Error saving redemptions:', e);
  }
}

/**
 * Save a redemption record locally. Idempotent: saving a record whose id
 * already exists updates it in place instead of duplicating it.
 */
export async function saveRedemptionLocal(
  record: RedemptionRecord
): Promise<RedemptionRecord> {
  const existing = await getRedemptions();
  const index = existing.findIndex((r) => r.id === record.id);
  if (index >= 0) {
    existing[index] = record;
    await storeRedemptions(existing);
  } else {
    await storeRedemptions([record, ...existing]);
  }
  return record;
}

/**
 * Upsert one redemption to Supabase, keyed by (user_id, client_id) so a
 * retry can never duplicate the row. On success the local copy is marked
 * 'synced'. Returns true on success; on failure the record stays
 * 'pending' for a later retry — the error is logged, never thrown.
 */
export async function syncRedemption(
  record: RedemptionRecord,
  userId?: string | null
): Promise<boolean> {
  if (!userId || !isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('redemptions').upsert(
      {
        user_id: userId,
        reward_id: record.rewardId,
        reward_title: record.rewardTitle,
        points_spent: record.pointsSpent,
        client_id: record.id,
      },
      { onConflict: 'user_id,client_id' }
    );
    if (error) {
      console.log('Error syncing redemption:', error.message);
      return false;
    }
    if (record.syncStatus !== 'synced') {
      await saveRedemptionLocal({ ...record, syncStatus: 'synced' });
    }
    return true;
  } catch (e) {
    console.log('Error syncing redemption:', e);
    return false;
  }
}

/**
 * Retry every locally 'pending' redemption for a signed-in user.
 * Returns how many records were confirmed synced by this call.
 */
export async function syncPendingRedemptions(userId?: string | null): Promise<number> {
  if (!userId || !isSupabaseConfigured) return 0;
  const pending = (await getRedemptions()).filter((r) => r.syncStatus === 'pending');
  let synced = 0;
  for (const record of pending) {
    if (await syncRedemption(record, userId)) synced += 1;
  }
  return synced;
}

/**
 * Convenience wrapper kept from the original API: create a record, save
 * it locally, and make one best-effort sync attempt. Callers that need
 * the deduction to be tied to the record id (the Rewards screen) should
 * use createRedemptionRecord + spendPoints + saveRedemptionLocal +
 * syncRedemption directly.
 */
export async function recordRedemption(
  reward: { id: string; title: string; cost: number },
  userId?: string | null
): Promise<RedemptionRecord> {
  const record = createRedemptionRecord(reward);
  await saveRedemptionLocal(record);
  await syncRedemption(record, userId);
  return record;
}
