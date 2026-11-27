// ─────────────────────────────────────────────────────────────────────────────
// StePPay shared configuration.
//
// SINGLE SOURCE OF TRUTH for the steps → points economy. Every screen
// (Home, Rewards, Achievements, History, the pedometer hook) MUST use these
// constants/helpers instead of inventing its own conversion rate.
// Previously the app had four different rates (100, 50, 10 steps per point
// and 1 XP per step) which made balances inconsistent between screens.
// ─────────────────────────────────────────────────────────────────────────────

/** How many steps earn 1 point. */
export const STEPS_PER_POINT = 100;

/** Daily step goal used by the step counter ring and history badges. */
export const DAILY_STEP_GOAL = 10000;

/** Average step length in metres (used for distance estimates). */
export const STEP_LENGTH_METERS = 0.762;

/** Average calories burned per step. */
export const CALORIES_PER_STEP = 0.04;

// ── Anti-cheat plausibility rules (lib/antiCheat.ts) ────────────────────────
// Server-plausibility limits applied BEFORE steps are credited as points.
// They are deliberately generous — an elite ultrarunner stays well inside
// them — so a legitimate user never loses honestly-earned steps; only
// sensor spoofing / shake-to-earn abuse trips them. Amounts above the
// limits are not credited; they are flagged for server review instead.

/** Maximum steps per day that can earn points. */
export const MAX_PLAUSIBLE_STEPS_PER_DAY = 60000;

/**
 * Maximum sustained stepping rate used for plausibility: 250 steps/min is
 * above the cadence of elite sprinters (~240 spm) and far above distance
 * running (~180 spm), so real activity — including catch-up batches —
 * never sustains above it.
 */
export const MAX_PLAUSIBLE_STEPS_PER_MINUTE = 250;

/**
 * Instant burst allowance: steps creditable at any moment regardless of
 * the time-based ceiling. Absorbs sensor batching (the OS delivering a
 * backlog of readings in one event) without weakening the sustained cap.
 */
export const STEP_CREDIT_BURST_ALLOWANCE = 1500;

/** Convert a step count into whole points (the one and only rate). */
export const stepsToPoints = (steps: number): number =>
  Math.floor(Math.max(0, steps) / STEPS_PER_POINT);

/** Convert a step count into kilometres (2 decimal places). */
export const stepsToDistanceKm = (steps: number): number =>
  parseFloat(((Math.max(0, steps) * STEP_LENGTH_METERS) / 1000).toFixed(2));

/** Convert a step count into estimated calories burned. */
export const stepsToCalories = (steps: number): number =>
  Math.round(Math.max(0, steps) * CALORIES_PER_STEP);

/** XP thresholds for levels (XP = lifetime points earned). */
export const LEVEL_THRESHOLDS = {
  silver: 2000,
  gold: 5000,
} as const;

export type LevelName = 'Bronze' | 'Silver' | 'Gold';

export const levelForXp = (xp: number): LevelName => {
  if (xp >= LEVEL_THRESHOLDS.gold) return 'Gold';
  if (xp >= LEVEL_THRESHOLDS.silver) return 'Silver';
  return 'Bronze';
};

/** AsyncStorage key recording that the user has completed onboarding. */
export const ONBOARDING_SEEN_KEY = 'has_seen_onboarding';

/** Format a Date as a local `YYYY-MM-DD` key (used for daily step records). */
export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Today's local date key. */
export const todayKey = (): string => toDateKey(new Date());
