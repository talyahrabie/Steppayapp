import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Append-only points ledger.
//
// The spendable balance is NOT a stored number anymore — it is DERIVED from
// an append-only list of earn/spend entries persisted in AsyncStorage
// (key `points_ledger_v1`). A mutable balance can drift (missed writes,
// double deductions, stale-state bugs); a ledger cannot: the balance is
// always exactly Σ(earn) − Σ(spend), every movement is auditable, and a
// spend tagged with a redemption id can never be applied twice.
//
// The pure functions (balanceFromLedger, xpFromLedger, appendEarnEntry,
// tryAppendSpend) operate on plain arrays and are unit-tested. Storage
// helpers below them are a thin AsyncStorage wrapper with serialized
// writes so concurrent persists can never interleave.
// ─────────────────────────────────────────────────────────────────────────────

export const LEDGER_KEY = 'points_ledger_v1';

export type LedgerEntryType = 'earn' | 'spend';

export interface LedgerEntry {
  /** Unique entry id. */
  id: string;
  type: LedgerEntryType;
  /** Positive point magnitude (direction comes from `type`). */
  points: number;
  /** ISO timestamp of the entry. */
  date: string;
  /**
   * What caused the entry: 'steps' for step earnings, a redemption id for
   * spends, 'migration' for the one-time legacy-balance import.
   */
  ref: string;
}

/** Generate a unique-enough client id (timestamp + random suffix). */
export function makeLedgerId(prefix = 'le'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createLedgerEntry(
  type: LedgerEntryType,
  points: number,
  ref: string,
  id: string = makeLedgerId(),
  date: string = new Date().toISOString()
): LedgerEntry {
  return { id, type, points: Math.max(0, Math.floor(points)), date, ref };
}

/** Spendable balance: total earned minus total spent (never below 0 in practice). */
export function balanceFromLedger(entries: readonly LedgerEntry[]): number {
  let balance = 0;
  for (const entry of entries) {
    balance += entry.type === 'earn' ? entry.points : -entry.points;
  }
  return balance;
}

/** Lifetime points earned (drives the level). Spends never reduce XP. */
export function xpFromLedger(entries: readonly LedgerEntry[]): number {
  let xp = 0;
  for (const entry of entries) {
    if (entry.type === 'earn') xp += entry.points;
  }
  return xp;
}

/** True when a spend entry with this ref (e.g. a redemption id) already exists. */
export function hasSpendWithRef(entries: readonly LedgerEntry[], ref: string): boolean {
  return entries.some((entry) => entry.type === 'spend' && entry.ref === ref);
}

/**
 * Append an earn entry. Returns the SAME array (no-op) when points <= 0 so
 * callers can cheaply detect that nothing changed.
 */
export function appendEarnEntry(
  entries: readonly LedgerEntry[],
  points: number,
  ref = 'steps',
  id?: string,
  date?: string
): LedgerEntry[] {
  if (!points || points <= 0) return entries as LedgerEntry[];
  return [...entries, createLedgerEntry('earn', points, ref, id, date)];
}

/**
 * Try to append a spend entry. Returns the new entries array, or `null`
 * when the spend must be rejected:
 *  - cost <= 0
 *  - insufficient balance (checked against the ledger-derived balance)
 *  - a spend with the same `ref` already exists — this is the idempotency
 *    guard that makes a double redemption (double-tap, retry) deduct once.
 */
export function tryAppendSpend(
  entries: readonly LedgerEntry[],
  cost: number,
  ref: string,
  id?: string,
  date?: string
): LedgerEntry[] | null {
  if (!cost || cost <= 0) return null;
  if (hasSpendWithRef(entries, ref)) return null;
  if (balanceFromLedger(entries) < cost) return null;
  return [...entries, createLedgerEntry('spend', cost, ref, id, date)];
}

/**
 * Build the one-time migration ledger for users of older builds, which
 * stored only a mutable balance + lifetime XP. Lifetime earnings become a
 * single earn entry; the difference between XP and the stored balance
 * (points already spent in the old build) becomes a single spend entry,
 * so the derived balance and XP match the legacy values exactly.
 */
export function buildMigrationLedger(
  legacyXp: number,
  legacyBalance: number,
  id: string = makeLedgerId('migration'),
  date: string = new Date().toISOString()
): LedgerEntry[] {
  const xp = Math.max(0, Math.floor(legacyXp));
  const balance = Math.min(xp, Math.max(0, Math.floor(legacyBalance)));
  const entries: LedgerEntry[] = [];
  if (xp > 0) {
    entries.push({ id: `${id}-earn`, type: 'earn', points: xp, date, ref: 'migration' });
  }
  const alreadySpent = xp - balance;
  if (alreadySpent > 0) {
    entries.push({ id: `${id}-spend`, type: 'spend', points: alreadySpent, date, ref: 'migration' });
  }
  return entries;
}

// ── Storage (AsyncStorage) ──────────────────────────────────────────────────

/** Load the persisted ledger, or `null` when none has been saved yet. */
export async function loadLedger(): Promise<LedgerEntry[] | null> {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (e): e is LedgerEntry =>
        e !== null &&
        typeof e === 'object' &&
        (e.type === 'earn' || e.type === 'spend') &&
        typeof e.points === 'number'
    );
  } catch (e) {
    console.log('Error loading points ledger:', e);
    return null;
  }
}

// Writes are chained so a later snapshot can never be overwritten by an
// earlier, slower write (AsyncStorage gives no ordering guarantee when
// setItem calls race).
let writeChain: Promise<void> = Promise.resolve();

/** Persist a ledger snapshot (serialized after any in-flight write). */
export function persistLedger(entries: readonly LedgerEntry[]): Promise<void> {
  const snapshot = JSON.stringify(entries);
  writeChain = writeChain
    .then(() => AsyncStorage.setItem(LEDGER_KEY, snapshot))
    .catch((e) => console.log('Error persisting points ledger:', e));
  return writeChain;
}
