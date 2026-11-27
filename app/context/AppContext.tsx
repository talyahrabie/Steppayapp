import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stepsToPoints, levelForXp, todayKey, ONBOARDING_SEEN_KEY } from '../../lib/config';
import {
  flushAnalytics,
  setAnalyticsUserId,
  trackEvent,
} from '../../lib/analytics';
import {
  cancelDailyReminder,
  getNotificationPermission,
  hasAskedNotificationPermission,
  registerExpoPushToken,
  requestNotificationPermission,
  scheduleDailyReminder,
  subscribeToPushTokenChanges,
} from '../../lib/notifications';
import {
  AntiCheatState,
  appendStepFlags,
  emptyAntiCheatState,
  loadAntiCheatState,
  persistAntiCheatState,
  validateStepCredit,
} from '../../lib/antiCheat';
import { requestHealthPermission } from '../../lib/healthSync';
import {
  LedgerEntry,
  appendEarnEntry,
  balanceFromLedger,
  buildMigrationLedger,
  loadLedger,
  makeLedgerId,
  persistLedger,
  tryAppendSpend,
  xpFromLedger,
} from '../../lib/pointsLedger';
import { supabase } from '../../lib/supabase';
import { syncPendingRedemptions } from '../../lib/redemptions';
import { flushPendingDaySyncs } from '../../lib/stepHistory';

type AppContextType = {
  theme: 'light' | 'dark';
  language: 'en' | 'ar';
  stepTracking: boolean;
  autoSync: boolean;
  /** Use Apple Health / Health Connect totals as the primary step source. */
  healthSync: boolean;
  pushNotifications: boolean;
  dhikrReminders: boolean;
  soundEnabled: boolean;
  /** Lifetime steps counted by the app. */
  steps: number;
  /** Spendable points balance (earned − redeemed). */
  points: number;
  /** Lifetime points earned — drives the level. Never decreases. */
  xp: number;
  level: string;
  toggleTheme: () => void;
  toggleStepTracking: () => void;
  toggleAutoSync: () => void;
  toggleHealthSync: () => void;
  togglePushNotifications: () => void;
  toggleDhikrReminders: () => void;
  toggleSoundEnabled: () => void;
  /**
   * Credit newly walked steps (the single choke point between the step
   * engine and the points ledger). Every batch passes the anti-cheat
   * plausibility gate (lib/antiCheat.ts) first: only plausible steps
   * enter the lifetime total and earn points; implausible excess is
   * withheld and flagged for server review. `opts` lets day close-outs
   * attribute steps to the day they belong to.
   */
  addSteps: (count: number, opts?: { dateKey?: string; atMs?: number }) => void;
  /**
   * Deduct points for a redemption by appending a spend entry to the
   * ledger. Returns false when the balance is too low OR when a spend
   * with the same `ref` (redemption id) was already recorded — so one
   * redemption can never deduct twice.
   */
  spendPoints: (cost: number, ref?: string) => boolean;
  changeLanguage: (lang: 'en' | 'ar') => void;
  t: (key: string) => string;
  colors: any;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const Themes = {
  light: { background: '#F8FAFC', text: '#1A1A1A', card: '#FFFFFF', icon: '#4A90E2', border: '#E0E0E0', subText: '#888888' },
  dark: { background: '#121212', text: '#FFFFFF', card: '#1E1E1E', icon: '#90CAF9', border: '#333333', subText: '#AAAAAA' }
};

const translations: any = {
  en: {
    nav_home: "Home",
    nav_activity: "Activity",
    nav_rewards: "Rewards",
    nav_profile: "Profile",
    settings_title: "Settings",
    sec_general: "General",
    sec_notifications: "Notifications",
    sec_appearance: "Appearance",
    sec_other: "Other",
    step_tracking: "Step Tracking",
    step_tracking_desc_on: "Counting your steps in the background",
    step_tracking_desc_off: "Step counting is paused",
    auto_sync: "Auto Sync",
    auto_sync_desc: "Sync your daily steps to your account automatically",
    health_sync: "Health App Sync",
    health_sync_desc_on: "Steps from Apple Health / Health Connect count even when the app is closed",
    health_sync_desc_off: "Only steps measured while the app runs are counted",
    push_notif: "Push Notifications",
    push_notif_desc: "Get notified about rewards and challenges",
    dhikr: "Dhikr Reminders",
    dhikr_desc: "Periodic remembrance reminders during the day",
    sound: "Sound Effects",
    sound_desc: "Play sounds for in-app actions and achievements",
    dark_mode: "Dark Mode",
    dark_mode_active: "Dark mode is on",
    dark_mode_inactive: "Dark mode is off",
    language: "Language",
    units: "Units",
    units_desc: "Kilometers (km) and kilocalories (kcal)",
    cancel: "Cancel",
    logout: "Log Out",
    logout_confirm: "Are you sure you want to log out?",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    about: "About StePPay",
    rate: "Rate App",
    delete_account: "Delete Account",
    delete_confirm: "This erases the app data stored on this device and signs you out. Your cloud account and synced history remain until you request full deletion — see the Privacy Policy.",
    badge_first_step: "First Step",
    badge_walker: "Brisk Walker",
    badge_warrior: "Distance Hero",
    badge_pro: "Pro Athlete",
    badge_desc: "Steps",
    current_level: "Current Level",
    media_cat_all: "All",
    media_cat_running: "Running",
    media_cat_workout: "Workout",
    media_cat_relaxing: "Relaxing",
    media_cat_quran: "Quran",
    media_cat_azkar: "Azkar",
    notif_reminder_title: "Don't break your streak! 🔥",
    notif_reminder_body: "Take an evening walk and reach today's 10,000-step goal.",
    notif_goal_title: "Goal reached! 🎉",
    notif_goal_body: "You hit today's 10,000-step goal. Great work — keep it up!"
  },
  ar: {
    nav_home: "الرئيسية",
    nav_activity: "نشاطي",
    nav_rewards: "مكافآت",
    nav_profile: "حسابي",
    settings_title: "الإعدادات",
    sec_general: "عام",
    sec_notifications: "الإشعارات",
    sec_appearance: "المظهر",
    sec_other: "أخرى",
    step_tracking: "تتبع الخطوات",
    step_tracking_desc_on: "يتم عدّ خطواتك في الخلفية",
    step_tracking_desc_off: "عدّ الخطوات متوقف مؤقتًا",
    auto_sync: "المزامنة التلقائية",
    auto_sync_desc: "مزامنة خطواتك اليومية مع حسابك تلقائيًا",
    health_sync: "مزامنة تطبيق الصحة",
    health_sync_desc_on: "خطوات Apple Health / Health Connect تُحتسب حتى والتطبيق مغلق",
    health_sync_desc_off: "تُحتسب فقط الخطوات المقاسة أثناء تشغيل التطبيق",
    push_notif: "الإشعارات الفورية",
    push_notif_desc: "تنبيهات بالمكافآت والتحديات الجديدة",
    dhikr: "تذكير الأذكار",
    dhikr_desc: "تذكيرات دورية بالأذكار خلال اليوم",
    sound: "المؤثرات الصوتية",
    sound_desc: "تشغيل أصوات لإجراءات وإنجازات التطبيق",
    dark_mode: "الوضع الليلي",
    dark_mode_active: "الوضع الليلي مفعّل",
    dark_mode_inactive: "الوضع الليلي متوقف",
    language: "اللغة",
    units: "الوحدات",
    units_desc: "كيلومتر (كم) وسعرات حرارية (kcal)",
    cancel: "إلغاء",
    logout: "تسجيل الخروج",
    logout_confirm: "هل أنت متأكد أنك تريد تسجيل الخروج؟",
    privacy: "سياسة الخصوصية",
    terms: "شروط الخدمة",
    about: "عن StePPay",
    rate: "قيم التطبيق",
    delete_account: "حذف الحساب",
    delete_confirm: "سيؤدي هذا إلى مسح بيانات التطبيق المخزنة على هذا الجهاز وتسجيل خروجك. يظل حسابك السحابي وسجلّك المتزامن موجودين حتى تطلب الحذف الكامل — راجع سياسة الخصوصية.",
    badge_first_step: "الخطوة الأولى",
    badge_walker: "المشي السريع",
    badge_warrior: "بطل المسافات",
    badge_pro: "الرياضي المحترف",
    badge_desc: "خطوة",
    current_level: "مستواك الحالي",
    media_cat_all: "الكل",
    media_cat_running: "الجري",
    media_cat_workout: "التمرين",
    media_cat_relaxing: "الاسترخاء",
    media_cat_quran: "القرآن",
    media_cat_azkar: "الأذكار",
    notif_reminder_title: "حافظ على سلسلتك! 🔥",
    notif_reminder_body: "اخرج لمشية مسائية وحقّق هدف اليوم: 10,000 خطوة.",
    notif_goal_title: "حققت الهدف! 🎉",
    notif_goal_body: "وصلت لهدف اليوم: 10,000 خطوة. عمل رائع — واصل!"
  }
};

const KEYS = {
  theme: 'setting_darkmode',
  language: 'setting_lang',
  stepTracking: 'setting_step_tracking',
  autoSync: 'setting_auto_sync',
  healthSync: 'setting_health_sync',
  pushNotifications: 'setting_push_notifications',
  dhikrReminders: 'setting_dhikr_reminders',
  soundEnabled: 'setting_sound_enabled',
  totalSteps: 'user_total_steps',
  points: 'user_points_balance',
  xp: 'user_xp',
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLang] = useState<'en' | 'ar'>('en');
  const [stepTracking, setStepTracking] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [healthSyncEnabled, setHealthSyncEnabled] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dhikrReminders, setDhikrReminders] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [steps, setSteps] = useState(0);
  const [points, setPoints] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState('Bronze');
  /** True once loadSettings has applied the persisted settings. */
  const [hydrated, setHydrated] = useState(false);
  /** Signed-in user id (null when signed out) — drives analytics + push. */
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  /** User id for which `session_start` was already reported. */
  const sessionStartForRef = useRef<string | null>(null);

  // Mirror of the progress state so addSteps/spendPoints always compute
  // from the latest values (the previous implementation read stale state
  // and could lose updates when called in quick succession). Points and
  // XP are DERIVED from the append-only ledger held here — the balance
  // can never drift from the recorded earn/spend entries.
  const progressRef = useRef<{ steps: number; ledger: LedgerEntry[] }>({
    steps: 0,
    ledger: [],
  });

  // Anti-cheat validator state (steps already credited per day). Held in
  // a ref so addSteps can gate synchronously; hydrated in loadSettings
  // and persisted after every validation that changes it.
  const antiCheatStateRef = useRef<AntiCheatState>(emptyAntiCheatState());

  useEffect(() => {
    loadSettings();
  }, []);

  // Analytics: one app_open per process start (anonymous until sign-in).
  useEffect(() => {
    trackEvent('app_open');
  }, []);

  // Retry queued cloud syncs (pending redemptions, failed daily-steps
  // upserts) whenever a signed-in session is available: at app start, on
  // sign-in, and whenever the app returns to the foreground. Retries are
  // idempotent on both sides, so running this often is safe.
  useEffect(() => {
    const retryPendingSyncs = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user?.id;
        if (!userId) return;
        await syncPendingRedemptions(userId);
        await flushPendingDaySyncs(userId);
      } catch (e) {
        console.log('Pending sync retry failed:', e);
      }
    };
    retryPendingSyncs();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;
      setSessionUserId(userId);
      setAnalyticsUserId(userId);
      if (event === 'SIGNED_IN' && userId) {
        retryPendingSyncs();
        // One session_start per signed-in user per process.
        if (sessionStartForRef.current !== userId) {
          sessionStartForRef.current = userId;
          trackEvent('session_start');
        }
      }
      if (event === 'SIGNED_OUT') {
        sessionStartForRef.current = null;
      }
    });
    // Restore the user id for a persisted session (no SIGNED_IN event
    // fires for the initial restore on every client version).
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id ?? null;
      setSessionUserId(userId);
      setAnalyticsUserId(userId);
    }).catch(() => {});
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        retryPendingSyncs();
        void flushAnalytics();
      } else if (next === 'background') {
        // Flush the analytics batch before the process is suspended.
        void flushAnalytics();
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  // Notifications setup (Phase 1 Batch B): keep the daily reminder and
  // the push-token registration in step with the user's setting, the OS
  // permission and the app language. Runs after settings hydrate; the
  // automatic permission prompt is shown at most once, and only after
  // onboarding has been seen (a natural moment — the Settings toggle
  // asks immediately because it is an explicit user gesture).
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      if (!pushNotifications) {
        await cancelDailyReminder();
        return;
      }
      let granted = await getNotificationPermission();
      if (!granted && !cancelled) {
        const asked = await hasAskedNotificationPermission();
        const seen = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
        if (!asked && seen === 'true') {
          granted = await requestNotificationPermission();
        }
      }
      if (cancelled || !granted) return;
      const strings = translations[language];
      await scheduleDailyReminder({
        title: strings.notif_reminder_title,
        body: strings.notif_reminder_body,
      });
      if (sessionUserId) await registerExpoPushToken(sessionUserId);
    })().catch((e) => console.log('Notification setup failed:', e));
    return () => {
      cancelled = true;
    };
  }, [hydrated, pushNotifications, language, sessionUserId]);

  // Re-register the Expo push token whenever Expo rotates it.
  useEffect(() => {
    if (!sessionUserId) return;
    const sub = subscribeToPushTokenChanges(() => {
      void registerExpoPushToken(sessionUserId);
    });
    return () => sub.remove();
  }, [sessionUserId]);

  useEffect(() => {
    setLevel(levelForXp(xp));
  }, [xp]);

  const loadSettings = async () => {
    try {
      const entries = await AsyncStorage.multiGet([
        KEYS.theme, KEYS.language, KEYS.stepTracking, KEYS.autoSync, KEYS.healthSync,
        KEYS.pushNotifications, KEYS.dhikrReminders, KEYS.soundEnabled,
        KEYS.totalSteps, KEYS.points, KEYS.xp,
      ]);
      const saved = Object.fromEntries(entries);

      if (saved[KEYS.theme] === 'true') setTheme('dark');
      if (saved[KEYS.language]) setLang(saved[KEYS.language] as 'en' | 'ar');
      if (saved[KEYS.stepTracking] !== null) setStepTracking(saved[KEYS.stepTracking] === 'true');
      if (saved[KEYS.autoSync] !== null) setAutoSync(saved[KEYS.autoSync] === 'true');
      if (saved[KEYS.healthSync] !== null) setHealthSyncEnabled(saved[KEYS.healthSync] === 'true');
      if (saved[KEYS.pushNotifications] !== null) setPushNotifications(saved[KEYS.pushNotifications] === 'true');
      if (saved[KEYS.dhikrReminders] !== null) setDhikrReminders(saved[KEYS.dhikrReminders] === 'true');
      if (saved[KEYS.soundEnabled] !== null) setSoundEnabled(saved[KEYS.soundEnabled] === 'true');

      const savedSteps = parseInt(saved[KEYS.totalSteps] ?? '0', 10) || 0;
      const savedXp = parseInt(saved[KEYS.xp] ?? '0', 10) || 0;
      // Older builds stored no separate balance: derive it from lifetime
      // points earned so existing users keep their balance.
      const savedPoints = saved[KEYS.points] !== null
        ? (parseInt(saved[KEYS.points] as string, 10) || 0)
        : stepsToPoints(savedSteps);

      // Points ledger: load it, or migrate the legacy balance/XP numbers
      // into it exactly once. From now on the balance is derived from the
      // ledger entries, never stored as a mutable number.
      let ledger = await loadLedger();
      if (ledger === null) {
        ledger = buildMigrationLedger(savedXp, savedPoints);
        await persistLedger(ledger);
      }

      progressRef.current = { steps: savedSteps, ledger };
      setSteps(savedSteps);
      setPoints(balanceFromLedger(ledger));
      setXp(xpFromLedger(ledger));

      // Anti-cheat state: how many steps each recent day has already
      // credited, so the plausibility ceilings survive app restarts.
      antiCheatStateRef.current = await loadAntiCheatState();
    } catch (e) { console.log(e); }
    setHydrated(true);
  };

  const persistProgress = async () => {
    const { steps, ledger } = progressRef.current;
    // Ledger writes are serialized inside persistLedger.
    void persistLedger(ledger);
    try {
      // Legacy keys are kept in sync as a mirror for older builds.
      await AsyncStorage.multiSet([
        [KEYS.totalSteps, steps.toString()],
        [KEYS.points, balanceFromLedger(ledger).toString()],
        [KEYS.xp, xpFromLedger(ledger).toString()],
      ]);
    } catch (e) { console.log(e); }
  };

  /** Push the derived counters from the ledger into React state. */
  const publishLedger = () => {
    setPoints(balanceFromLedger(progressRef.current.ledger));
    setXp(xpFromLedger(progressRef.current.ledger));
  };

  /**
   * Add newly walked steps — THE single choke point between the step
   * engine and the points ledger. Every batch first passes the
   * anti-cheat plausibility gate (lib/antiCheat.ts):
   *
   * - Plausible steps enter the lifetime total and earn points at the
   *   single global rate (lib/config.ts): every STEPS_PER_POINT
   *   lifetime steps earns 1 point, appended to the ledger as ONE earn
   *   entry per batch, never per step.
   * - Implausible excess (above the daily cap or faster than a human
   *   can step) is withheld: it never reaches the lifetime total, so it
   *   can never earn points, and it is recorded as a StepFlag that
   *   syncs to Supabase for server review.
   *
   * `opts.dateKey`/`opts.atMs` attribute the batch to the day it
   * belongs to — day close-outs pass the closed day and its end-of-day
   * timestamp so yesterday's honestly-walked remainder is judged
   * against yesterday's full-day allowance.
   */
  const addSteps = (count: number, opts?: { dateKey?: string; atMs?: number }) => {
    if (!count || count <= 0) return;
    const validation = validateStepCredit(antiCheatStateRef.current, {
      delta: count,
      dateKey: opts?.dateKey ?? todayKey(),
      atMs: opts?.atMs ?? Date.now(),
    });
    antiCheatStateRef.current = validation.state;
    void persistAntiCheatState(validation.state);
    if (validation.flag) {
      // Persist the flag locally; lib/stepHistory syncs it to the
      // `step_flags` table with the day's next cloud sync.
      void appendStepFlags([validation.flag]);
      console.log(
        `Anti-cheat: withheld ${validation.flaggedSteps} implausible steps (${validation.flag.reason})`
      );
    }
    const credited = validation.creditedSteps;
    if (credited <= 0) return;
    const prev = progressRef.current;
    const newSteps = prev.steps + credited;
    const earnedDelta = stepsToPoints(newSteps) - stepsToPoints(prev.steps);
    progressRef.current = {
      steps: newSteps,
      ledger: earnedDelta > 0
        ? appendEarnEntry(prev.ledger, earnedDelta, 'steps')
        : prev.ledger,
    };
    setSteps(progressRef.current.steps);
    publishLedger();
    persistProgress();
  };

  /**
   * Deduct points for a redemption by appending a ledger spend entry.
   * `ref` should be the redemption's idempotency id: a second call with
   * the same ref is rejected, so a redemption deducts exactly once.
   * Returns false when the balance (checked against the ledger at call
   * time) is too low.
   */
  const spendPoints = (cost: number, ref?: string): boolean => {
    const next = tryAppendSpend(
      progressRef.current.ledger,
      cost,
      ref ?? makeLedgerId('spend')
    );
    if (next === null) return false;
    progressRef.current = { ...progressRef.current, ledger: next };
    publishLedger();
    persistProgress();
    return true;
  };

  const makeToggle = (
    value: boolean,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    key: string
  ) => async () => {
    const newValue = !value;
    setter(newValue);
    await AsyncStorage.setItem(key, newValue ? 'true' : 'false');
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await AsyncStorage.setItem(KEYS.theme, newTheme === 'dark' ? 'true' : 'false');
  };

  const toggleStepTracking = makeToggle(stepTracking, setStepTracking, KEYS.stepTracking);
  const toggleAutoSync = makeToggle(autoSync, setAutoSync, KEYS.autoSync);

  /**
   * Health-sync toggle. Turning it ON also presents the platform
   * permission prompt (Apple Health / Health Connect) — the clear
   * in-app entry point for the grant; the pedometer flow re-checks the
   * state afterwards and starts merging health totals when granted.
   * Turning it OFF stops health reads immediately (pedometer-only).
   */
  const toggleHealthSync = async () => {
    const newValue = !healthSyncEnabled;
    setHealthSyncEnabled(newValue);
    await AsyncStorage.setItem(KEYS.healthSync, newValue ? 'true' : 'false');
    if (newValue) {
      trackEvent('health_sync_enabled');
      await requestHealthPermission().catch((e) =>
        console.log('Health permission request from Settings failed:', e)
      );
    }
  };
  /**
   * Push-notifications toggle. Turning it ON is an explicit user
   * gesture, so it asks for the OS permission immediately and, when
   * granted, (re)schedules the daily reminder and registers the push
   * token. Turning it OFF cancels the daily reminder.
   */
  const togglePushNotifications = async () => {
    const newValue = !pushNotifications;
    setPushNotifications(newValue);
    await AsyncStorage.setItem(KEYS.pushNotifications, newValue ? 'true' : 'false');
    if (!newValue) {
      await cancelDailyReminder();
      return;
    }
    const granted = await requestNotificationPermission();
    if (granted) {
      await scheduleDailyReminder({
        title: t('notif_reminder_title'),
        body: t('notif_reminder_body'),
      });
      const { data } = await supabase.auth.getSession();
      await registerExpoPushToken(data.session?.user?.id ?? null);
    }
  };
  const toggleDhikrReminders = makeToggle(dhikrReminders, setDhikrReminders, KEYS.dhikrReminders);
  const toggleSoundEnabled = makeToggle(soundEnabled, setSoundEnabled, KEYS.soundEnabled);

  const changeLanguage = async (lang: 'en' | 'ar') => {
    setLang(lang);
    await AsyncStorage.setItem(KEYS.language, lang);
  };

  const t = (key: string) => translations[language]?.[key] || key;

  return (
    <AppContext.Provider value={{
      theme, language, stepTracking, autoSync, healthSync: healthSyncEnabled, pushNotifications, dhikrReminders, soundEnabled,
      steps, points, xp, level,
      toggleTheme, toggleStepTracking, toggleAutoSync, toggleHealthSync, togglePushNotifications,
      toggleDhikrReminders, toggleSoundEnabled, addSteps, spendPoints,
      changeLanguage, t, colors: Themes[theme]
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
