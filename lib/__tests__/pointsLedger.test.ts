import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LedgerEntry,
  appendEarnEntry,
  balanceFromLedger,
  buildMigrationLedger,
  createLedgerEntry,
  hasSpendWithRef,
  loadLedger,
  persistLedger,
  tryAppendSpend,
  xpFromLedger,
} from '../pointsLedger';

const earn = (points: number, ref = 'steps', id = `e-${points}-${ref}`): LedgerEntry =>
  createLedgerEntry('earn', points, ref, id, '2026-11-26T08:00:00.000Z');
const spend = (points: number, ref: string, id = `s-${points}-${ref}`): LedgerEntry =>
  createLedgerEntry('spend', points, ref, id, '2026-11-26T09:00:00.000Z');

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('balance and XP derivation', () => {
  it('balance is Σearn − Σspend after mixed earn/spend entries', () => {
    const entries = [earn(100), earn(50), spend(30, 'red-1'), earn(25), spend(45, 'red-2')];
    expect(balanceFromLedger(entries)).toBe(100);
  });

  it('XP counts lifetime earnings only — spends never reduce it', () => {
    const entries = [earn(100), spend(100, 'red-1'), earn(20)];
    expect(xpFromLedger(entries)).toBe(120);
    expect(balanceFromLedger(entries)).toBe(20);
  });

  it('empty ledger means zero balance and zero XP', () => {
    expect(balanceFromLedger([])).toBe(0);
    expect(xpFromLedger([])).toBe(0);
  });
});

describe('appendEarnEntry', () => {
  it('appends a positive earn and leaves the original array untouched', () => {
    const before = [earn(10)];
    const after = appendEarnEntry(before, 5, 'steps', 'e-new');
    expect(after).toHaveLength(2);
    expect(before).toHaveLength(1);
    expect(balanceFromLedger(after)).toBe(15);
  });

  it('is a no-op for zero/negative points (batched threshold earnings)', () => {
    const before = [earn(10)];
    expect(appendEarnEntry(before, 0)).toBe(before);
  });
});

describe('tryAppendSpend', () => {
  it('appends a spend when the balance covers it', () => {
    const entries = [earn(100)];
    const next = tryAppendSpend(entries, 40, 'red-1', 's-1');
    expect(next).not.toBeNull();
    expect(balanceFromLedger(next!)).toBe(60);
  });

  it('rejects a spend above the ledger-derived balance', () => {
    const entries = [earn(100), spend(70, 'red-1')];
    expect(tryAppendSpend(entries, 31, 'red-2')).toBeNull();
    expect(tryAppendSpend(entries, 30, 'red-2')).not.toBeNull();
  });

  it('rejects zero/negative costs', () => {
    expect(tryAppendSpend([earn(100)], 0, 'red-1')).toBeNull();
    expect(tryAppendSpend([earn(100)], -5, 'red-1')).toBeNull();
  });

  it('IDEMPOTENCY: a second spend with the same ref is rejected — deducts once', () => {
    const entries = [earn(500)];
    const first = tryAppendSpend(entries, 200, 'red-abc', 's-1');
    expect(first).not.toBeNull();
    const second = tryAppendSpend(first!, 200, 'red-abc', 's-2');
    expect(second).toBeNull();
    expect(balanceFromLedger(first!)).toBe(300);
    expect(hasSpendWithRef(first!, 'red-abc')).toBe(true);
  });
});

describe('buildMigrationLedger', () => {
  it('preserves the legacy balance and XP exactly', () => {
    const entries = buildMigrationLedger(120, 70, 'mig', '2026-11-26T00:00:00.000Z');
    expect(xpFromLedger(entries)).toBe(120);
    expect(balanceFromLedger(entries)).toBe(70);
  });

  it('handles a user who never spent (balance == XP) with a single earn', () => {
    const entries = buildMigrationLedger(50, 50, 'mig');
    expect(entries).toHaveLength(1);
    expect(balanceFromLedger(entries)).toBe(50);
  });

  it('handles a brand-new user (no legacy values)', () => {
    expect(buildMigrationLedger(0, 0, 'mig')).toEqual([]);
  });

  it('clamps a corrupt legacy balance above XP', () => {
    const entries = buildMigrationLedger(40, 999, 'mig');
    expect(balanceFromLedger(entries)).toBe(40);
    expect(xpFromLedger(entries)).toBe(40);
  });
});

describe('storage round-trip', () => {
  it('persists and reloads the ledger identically', async () => {
    const entries = [earn(100), spend(25, 'red-1')];
    await persistLedger(entries);
    const loaded = await loadLedger();
    expect(loaded).toEqual(entries);
    expect(balanceFromLedger(loaded!)).toBe(75);
  });

  it('returns null when no ledger has been saved yet (migration signal)', async () => {
    expect(await loadLedger()).toBeNull();
  });

  it('survives corrupt stored data by returning null', async () => {
    await AsyncStorage.setItem('points_ledger_v1', '{not json');
    expect(await loadLedger()).toBeNull();
  });
});
