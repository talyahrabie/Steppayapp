import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MAX_PLAUSIBLE_STEPS_PER_DAY,
  MAX_PLAUSIBLE_STEPS_PER_MINUTE,
  STEP_CREDIT_BURST_ALLOWANCE,
} from './config';
import { startOfDayKey } from './stepEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Anti-cheat plausibility gate for step crediting.
//
// Every batch of steps passes through `validateStepCredit` BEFORE it can
// earn points (the single choke point is AppContext.addSteps). The rules
// (lib/config.ts) are plausibility ceilings, not targets:
//
//   1. DAY CAP — at most MAX_PLAUSIBLE_STEPS_PER_DAY steps per day earn
//      points. A day total above the cap is credited UP TO the cap; only
//      the excess is withheld, so an honest user never loses real steps.
//   2. RATE CEILING — credited steps for a day can never outrun wall
//      clock time: by any moment of the day at most
//      (minutes since midnight × MAX_PLAUSIBLE_STEPS_PER_MINUTE) +
//      STEP_CREDIT_BURST_ALLOWANCE steps can have been credited. A
//      catch-up batch in the evening therefore passes untouched (the
//      whole day's minutes back it), while 20,000 steps "walked" in the
//      first five minutes of a day is physically impossible and is
//      withheld. Sensor spoofing that drips steps in slowly is still
//      bounded by the sustained rate and the day cap.
//
// Withheld steps are NOT silently dropped: each violation produces a
// StepFlag persisted locally and synced to the `step_flags` Supabase
// table (see lib/stepHistory.ts) for server review.
//
// The validator is a pure function of (state, request); storage below is
// a thin AsyncStorage wrapper with serialized writes, mirroring
// lib/pointsLedger.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const ANTI_CHEAT_STATE_KEY = 'anti_cheat_state_v1';
export const STEP_FLAGS_KEY = 'step_flags_v1';

export type StepFlagReason = 'day_cap_exceeded' | 'rate_exceeded';

export interface StepFlag {
  /** Client-generated id — also the sync idempotency id (`client_id`). */
  id: string;
  /** Local date key (`YYYY-MM-DD`) the withheld steps belonged to. */
  date: string;
  reason: StepFlagReason;
  /** Steps in the batch that was presented for crediting. */
  reportedSteps: number;
  /** Steps of that batch that WERE credited. */
  creditedSteps: number;
  /** Steps withheld (reportedSteps − creditedSteps). */
  flaggedSteps: number;
  /** ISO timestamp of the validation. */
  createdAt: string;
  /** True once the flag row has been accepted by Supabase. */
  synced: boolean;
}

export interface AntiCheatState {
  /** Steps credited toward points per local date key. Pruned to recent days. */
  creditedByDate: Record<string, number>;
}

export interface AntiCheatConfig {
  maxStepsPerDay: number;
  maxStepsPerMinute: number;
  burstAllowanceSteps: number;
}

export const DEFAULT_ANTI_CHEAT_CONFIG: AntiCheatConfig = {
  maxStepsPerDay: MAX_PLAUSIBLE_STEPS_PER_DAY,
  maxStepsPerMinute: MAX_PLAUSIBLE_STEPS_PER_MINUTE,
  burstAllowanceSteps: STEP_CREDIT_BURST_ALLOWANCE,
};

export interface StepCreditRequest {
  /** Steps presented for crediting (one engine batch). */
  delta: number;
  /** Local date key the steps belong to (close-outs pass the closed day). */
  dateKey: string;
  /**
   * Moment the credit is evaluated, epoch ms. Close-outs for a finished
   * day pass that day's end-of-day so the rate ceiling is judged against
   * the full day, not against "just after midnight".
   */
  atMs: number;
}

export interface CreditValidation {
  /** Steps allowed through to the points engine. */
  creditedSteps: number;
  /** Steps withheld as implausible (0 when the batch was fully plausible). */
  flaggedSteps: number;
  /** Flag to persist/sync, or null when nothing was withheld. */
  flag: StepFlag | null;
  /** Next validator state (input state is never mutated). */
  state: AntiCheatState;
}

export function emptyAntiCheatState(): AntiCheatState {
  return { creditedByDate: {} };
}

/** Generate a unique-enough client id (timestamp + random suffix). */
export function makeFlagId(prefix = 'flag'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Keep only the most recent `keep` days in the credited-by-date map. */
function pruneCreditedByDate(
  map: Record<string, number>,
  keep = 7
): Record<string, number> {
  const keys = Object.keys(map).sort();
  if (keys.length <= keep) return map;
  const pruned: Record<string, number> = {};
  for (const key of keys.slice(keys.length - keep)) pruned[key] = map[key];
  return pruned;
}

/**
 * Validate one batch of steps for crediting.
 *
 * Pure: same (state, request, config) → same result, no mutation.
 * The creditable ceiling for the batch is the LOWER of the day cap and
 * the time-based rate ceiling, minus what the day has already credited;
 * the batch is credited up to that ceiling and the rest is flagged.
 */
export function validateStepCredit(
  state: AntiCheatState,
  request: StepCreditRequest,
  config: AntiCheatConfig = DEFAULT_ANTI_CHEAT_CONFIG,
  flagId: string = makeFlagId(),
  createdAt: string = new Date().toISOString()
): CreditValidation {
  const delta = Math.max(0, Math.floor(request.delta));
  const alreadyCredited = Math.max(0, Math.floor(state.creditedByDate[request.dateKey] ?? 0));

  if (delta <= 0) {
    return { creditedSteps: 0, flaggedSteps: 0, flag: null, state };
  }

  // Rate ceiling: steps creditable by `atMs` on `dateKey`. Minutes are
  // measured from that day's local midnight and clamped to [0, 1440] so
  // an end-of-day close-out timestamp yields the full day's allowance.
  const dayStartMs = startOfDayKey(request.dateKey).getTime();
  const minutesElapsed = Math.min(
    1440,
    Math.max(0, (request.atMs - dayStartMs) / 60000)
  );
  const rateCeiling =
    Math.floor(minutesElapsed * config.maxStepsPerMinute) + config.burstAllowanceSteps;
  const ceiling = Math.min(config.maxStepsPerDay, rateCeiling);

  const creditedSteps = Math.max(0, Math.min(delta, ceiling - alreadyCredited));
  const flaggedSteps = delta - creditedSteps;

  const nextCreditedByDate = pruneCreditedByDate({
    ...state.creditedByDate,
    [request.dateKey]: alreadyCredited + creditedSteps,
  });

  let flag: StepFlag | null = null;
  if (flaggedSteps > 0) {
    // The binding constraint decides the reason: if the day's credited
    // total (including this batch) crosses the daily cap it is a cap
    // violation; otherwise the batch simply arrived faster than a human
    // can step.
    const reason: StepFlagReason =
      alreadyCredited + delta > config.maxStepsPerDay
        ? 'day_cap_exceeded'
        : 'rate_exceeded';
    flag = {
      id: flagId,
      date: request.dateKey,
      reason,
      reportedSteps: delta,
      creditedSteps,
      flaggedSteps,
      createdAt,
      synced: false,
    };
  }

  return {
    creditedSteps,
    flaggedSteps,
    flag,
    state: { creditedByDate: nextCreditedByDate },
  };
}

// ── Storage (AsyncStorage) ──────────────────────────────────────────────────

function isStepFlag(value: unknown): value is StepFlag {
  if (value === null || typeof value !== 'object') return false;
  const f = value as Partial<StepFlag>;
  return (
    typeof f.id === 'string' &&
    typeof f.date === 'string' &&
    (f.reason === 'day_cap_exceeded' || f.reason === 'rate_exceeded') &&
    typeof f.reportedSteps === 'number' &&
    typeof f.creditedSteps === 'number' &&
    typeof f.flaggedSteps === 'number'
  );
}

/** Load the persisted validator state (empty state when none/corrupt). */
export async function loadAntiCheatState(): Promise<AntiCheatState> {
  try {
    const raw = await AsyncStorage.getItem(ANTI_CHEAT_STATE_KEY);
    if (!raw) return emptyAntiCheatState();
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.creditedByDate &&
      typeof parsed.creditedByDate === 'object'
    ) {
      const creditedByDate: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed.creditedByDate)) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          creditedByDate[key] = Math.max(0, Math.floor(value));
        }
      }
      return { creditedByDate };
    }
    return emptyAntiCheatState();
  } catch (e) {
    console.log('Error loading anti-cheat state:', e);
    return emptyAntiCheatState();
  }
}

// Writes are chained so concurrent persists can never interleave
// (same pattern as the points ledger).
let stateWriteChain: Promise<void> = Promise.resolve();

/** Persist the validator state (serialized after any in-flight write). */
export function persistAntiCheatState(state: AntiCheatState): Promise<void> {
  const snapshot = JSON.stringify(state);
  stateWriteChain = stateWriteChain
    .then(() => AsyncStorage.setItem(ANTI_CHEAT_STATE_KEY, snapshot))
    .catch((e) => console.log('Error persisting anti-cheat state:', e));
  return stateWriteChain;
}

/** Load all persisted step flags (empty array when none/corrupt). */
export async function loadStepFlags(): Promise<StepFlag[]> {
  try {
    const raw = await AsyncStorage.getItem(STEP_FLAGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStepFlag).map((f) => ({ ...f, synced: f.synced === true }));
  } catch (e) {
    console.log('Error loading step flags:', e);
    return [];
  }
}

let flagsWriteChain: Promise<void> = Promise.resolve();

function persistStepFlags(flags: readonly StepFlag[]): Promise<void> {
  const snapshot = JSON.stringify(flags);
  flagsWriteChain = flagsWriteChain
    .then(() => AsyncStorage.setItem(STEP_FLAGS_KEY, snapshot))
    .catch((e) => console.log('Error persisting step flags:', e));
  return flagsWriteChain;
}

/** Append new flags to the persisted store. Returns the full store. */
export async function appendStepFlags(newFlags: readonly StepFlag[]): Promise<StepFlag[]> {
  if (newFlags.length === 0) return loadStepFlags();
  const existing = await loadStepFlags();
  const merged = [...existing, ...newFlags];
  await persistStepFlags(merged);
  return merged;
}

/** Flags for one date key. */
export async function getStepFlagsForDate(dateKey: string): Promise<StepFlag[]> {
  const flags = await loadStepFlags();
  return flags.filter((f) => f.date === dateKey);
}

/** Flags not yet accepted by the server (optionally for one date). */
export async function getUnsyncedStepFlags(dateKey?: string): Promise<StepFlag[]> {
  const flags = await loadStepFlags();
  return flags.filter((f) => !f.synced && (dateKey === undefined || f.date === dateKey));
}

/** Mark flags as synced after the server accepted them. */
export async function markStepFlagsSynced(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const flags = await loadStepFlags();
  await persistStepFlags(
    flags.map((f) => (idSet.has(f.id) ? { ...f, synced: true } : f))
  );
}
