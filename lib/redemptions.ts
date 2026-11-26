import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Reward redemptions.
//
// Every redemption is recorded locally (AsyncStorage, key `user_redemptions`)
// and, when the user is signed in, inserted into the Supabase `redemptions`
// table. Points are deducted by AppContext.spendPoints BEFORE calling
// recordRedemption, so a redemption can never be recorded for free.
// ─────────────────────────────────────────────────────────────────────────────

const REDEMPTIONS_KEY = 'user_redemptions';

export interface RedemptionRecord {
  id: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  /** ISO timestamp of the redemption. */
  date: string;
}

/** All locally recorded redemptions, newest first. */
export async function getRedemptions(): Promise<RedemptionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(REDEMPTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.log('Error reading redemptions:', e);
    return [];
  }
}

/**
 * Record a redemption locally and (best effort) in Supabase.
 * Returns the stored record.
 */
export async function recordRedemption(
  reward: { id: string; title: string; cost: number },
  userId?: string | null
): Promise<RedemptionRecord> {
  const record: RedemptionRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointsSpent: reward.cost,
    date: new Date().toISOString(),
  };

  try {
    const existing = await getRedemptions();
    await AsyncStorage.setItem(REDEMPTIONS_KEY, JSON.stringify([record, ...existing]));
  } catch (e) {
    console.log('Error saving redemption locally:', e);
  }

  if (userId && isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('redemptions').insert({
        user_id: userId,
        reward_id: record.rewardId,
        reward_title: record.rewardTitle,
        points_spent: record.pointsSpent,
      });
      if (error) console.log('Error recording redemption in Supabase:', error.message);
    } catch (e) {
      console.log('Error recording redemption in Supabase:', e);
    }
  }

  return record;
}
