import { Platform } from 'react-native';
import { endOfDayKey, startOfDayKey } from './stepEngine';
import { todayKey } from './config';

// ─────────────────────────────────────────────────────────────────────────────
// Health-platform step sync (Apple HealthKit on iOS, Health Connect on
// Android).
//
// WHY: the pedometer provider only reports while the app can run. The
// health platform is the device's authoritative step store — it keeps
// counting while the app is closed and aggregates companion devices
// (watches) — so its day total is the primary source for catch-up
// (see lib/stepEngine.ts: mergeDailyTotals / resolvePrimarySource).
//
// LIBRARIES (chosen for Expo managed + dev-build support):
//  - Android: `react-native-health-connect` — ships an Expo config
//    plugin (manifest rationale intents) and a typed aggregate API.
//  - iOS: `@kingstinct/react-native-healthkit` — the actively maintained
//    HealthKit library; ships an Expo config plugin that adds the
//    HealthKit entitlement + usage strings, and a Nitro-based typed API.
//    (`react-native-health` was rejected: no maintained config plugin.)
//
// SAFETY CONTRACT: native modules are LAZILY required inside try/catch
// and every call is guarded. In Expo Go (or any build without the native
// modules) every function degrades to "unavailable"/null and the app
// silently keeps the pedometer-only behaviour — it can never crash
// because a health module is missing.
// ─────────────────────────────────────────────────────────────────────────────

export type HealthPermissionState = 'granted' | 'denied' | 'unknown' | 'unavailable';

type HealthConnectModule = typeof import('react-native-health-connect');
type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

const STEP_COUNT_IDENTIFIER = 'HKQuantityTypeIdentifierStepCount' as const;

let healthConnectCache: HealthConnectModule | null | undefined;
let healthKitCache: HealthKitModule | null | undefined;

function loadHealthConnect(): HealthConnectModule | null {
  if (healthConnectCache !== undefined) return healthConnectCache;
  try {
    // Lazy require: the module throws at import time when its native
    // side is not linked (Expo Go), so it must never be a static import.
    healthConnectCache = require('react-native-health-connect') as HealthConnectModule;
  } catch (e) {
    console.log('Health Connect module unavailable:', e);
    healthConnectCache = null;
  }
  return healthConnectCache;
}

function loadHealthKit(): HealthKitModule | null {
  if (healthKitCache !== undefined) return healthKitCache;
  try {
    healthKitCache = require('@kingstinct/react-native-healthkit') as HealthKitModule;
  } catch (e) {
    console.log('HealthKit module unavailable:', e);
    healthKitCache = null;
  }
  return healthKitCache;
}

/** True when this platform has a health store the app could talk to. */
export function healthPlatformAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

// ── Android: Health Connect ─────────────────────────────────────────────────

async function healthConnectReady(): Promise<HealthConnectModule | null> {
  const hc = loadHealthConnect();
  if (!hc) return null;
  try {
    const status = await hc.getSdkStatus();
    if (status !== hc.SdkAvailabilityStatus.SDK_AVAILABLE) return null;
    const initialized = await hc.initialize();
    return initialized ? hc : null;
  } catch (e) {
    console.log('Health Connect init failed:', e);
    return null;
  }
}

async function healthConnectGranted(hc: HealthConnectModule): Promise<boolean> {
  const granted = await hc.getGrantedPermissions();
  return granted.some((p) => p.recordType === 'Steps' && p.accessType === 'read');
}

// ── iOS: HealthKit ──────────────────────────────────────────────────────────

async function healthKitReady(): Promise<HealthKitModule | null> {
  const hk = loadHealthKit();
  if (!hk) return null;
  try {
    const available = await hk.isHealthDataAvailableAsync();
    return available ? hk : null;
  } catch (e) {
    console.log('HealthKit availability check failed:', e);
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Whether health sync can work at all on this device/build: the native
 * module is linked and the platform health store reports itself usable.
 * Cheap enough to call during the pedometer permission flow.
 */
export async function isHealthSyncSupported(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') return (await healthConnectReady()) !== null;
    if (Platform.OS === 'ios') return (await healthKitReady()) !== null;
    return false;
  } catch (e) {
    console.log('Health support check failed:', e);
    return false;
  }
}

/**
 * Current permission state without prompting.
 *
 * Android reports the real grant. iOS deliberately hides read-permission
 * status, so "granted" there means: HealthKit is available and the
 * authorization request has already been presented (nothing left to
 * ask); queries simply return empty when the user declined. Before the
 * first request the state is 'unknown'.
 */
export async function getHealthPermissionState(): Promise<HealthPermissionState> {
  try {
    if (Platform.OS === 'android') {
      const hc = await healthConnectReady();
      if (!hc) return 'unavailable';
      return (await healthConnectGranted(hc)) ? 'granted' : 'denied';
    }
    if (Platform.OS === 'ios') {
      const hk = await healthKitReady();
      if (!hk) return 'unavailable';
      const status = await hk.getRequestStatusForAuthorization({
        toRead: [STEP_COUNT_IDENTIFIER],
      });
      // AuthorizationRequestStatus.shouldRequest ⇔ never asked.
      return status === hk.AuthorizationRequestStatus.shouldRequest
        ? 'unknown'
        : 'granted';
    }
    return 'unavailable';
  } catch (e) {
    console.log('Health permission state check failed:', e);
    return 'unavailable';
  }
}

/**
 * Present the platform permission prompt for reading steps.
 * Returns true when read access is in effect afterwards.
 */
export async function requestHealthPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const hc = await healthConnectReady();
      if (!hc) return false;
      const granted = await hc.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
      ]);
      return granted.some((p) => p.recordType === 'Steps' && p.accessType === 'read');
    }
    if (Platform.OS === 'ios') {
      const hk = await healthKitReady();
      if (!hk) return false;
      // Resolves true when the request was presented; iOS does not
      // reveal whether the user allowed reads (by design), so a
      // completed request counts as "in effect" and empty query results
      // are treated as zero steps by the merge logic.
      return await hk.requestAuthorization({ toRead: [STEP_COUNT_IDENTIFIER] });
    }
    return false;
  } catch (e) {
    console.log('Health permission request failed:', e);
    return false;
  }
}

/**
 * Total steps recorded by the health platform in [start, end], or null
 * when the source cannot answer (module missing, not permitted, error).
 * A platform that answers "no data" yields 0, not null.
 */
export async function fetchHealthStepsForRange(
  start: Date,
  end: Date
): Promise<number | null> {
  try {
    if (Platform.OS === 'android') {
      const hc = await healthConnectReady();
      if (!hc) return null;
      if (!(await healthConnectGranted(hc))) return null;
      const result = await hc.aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: {
          operator: 'between',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
      });
      const total = result.COUNT_TOTAL;
      return typeof total === 'number' && Number.isFinite(total)
        ? Math.max(0, Math.floor(total))
        : null;
    }
    if (Platform.OS === 'ios') {
      const hk = await healthKitReady();
      if (!hk) return null;
      const stats = await hk.queryStatisticsForQuantity(
        STEP_COUNT_IDENTIFIER,
        ['cumulativeSum'],
        {
          unit: 'count',
          filter: { date: { startDate: start, endDate: end } },
        }
      );
      const total = stats.sumQuantity?.quantity;
      return typeof total === 'number' && Number.isFinite(total)
        ? Math.max(0, Math.floor(total))
        : 0;
    }
    return null;
  } catch (e) {
    console.log('Health step fetch failed:', e);
    return null;
  }
}

/**
 * Health-platform total for one local day (`YYYY-MM-DD`). For today the
 * range ends now; for past days it covers the full day — used by the
 * midnight close-out to recover steps walked while the app was dead.
 */
export async function fetchHealthStepsForDay(dateKey: string): Promise<number | null> {
  const start = startOfDayKey(dateKey);
  const end = dateKey === todayKey() ? new Date() : endOfDayKey(dateKey);
  return fetchHealthStepsForRange(start, end);
}

/** Health-platform total for today (null when the source cannot answer). */
export async function fetchHealthStepsToday(): Promise<number | null> {
  return fetchHealthStepsForDay(todayKey());
}
