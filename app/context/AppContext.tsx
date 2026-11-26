import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stepsToPoints, levelForXp } from '../../lib/config';

type AppContextType = {
  theme: 'light' | 'dark';
  language: 'en' | 'ar';
  stepTracking: boolean;
  autoSync: boolean;
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
  togglePushNotifications: () => void;
  toggleDhikrReminders: () => void;
  toggleSoundEnabled: () => void;
  addSteps: (count: number) => void;
  /** Deduct points for a redemption. Returns false when balance is too low. */
  spendPoints: (cost: number) => boolean;
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
    current_level: "Current Level"
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
    current_level: "مستواك الحالي"
  }
};

const KEYS = {
  theme: 'setting_darkmode',
  language: 'setting_lang',
  stepTracking: 'setting_step_tracking',
  autoSync: 'setting_auto_sync',
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
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dhikrReminders, setDhikrReminders] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [steps, setSteps] = useState(0);
  const [points, setPoints] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState('Bronze');

  // Mirror of the progress counters so addSteps/spendPoints always compute
  // from the latest values (the previous implementation read stale state
  // and could lose updates when called in quick succession).
  const progressRef = useRef({ steps: 0, points: 0, xp: 0 });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setLevel(levelForXp(xp));
  }, [xp]);

  const loadSettings = async () => {
    try {
      const entries = await AsyncStorage.multiGet([
        KEYS.theme, KEYS.language, KEYS.stepTracking, KEYS.autoSync,
        KEYS.pushNotifications, KEYS.dhikrReminders, KEYS.soundEnabled,
        KEYS.totalSteps, KEYS.points, KEYS.xp,
      ]);
      const saved = Object.fromEntries(entries);

      if (saved[KEYS.theme] === 'true') setTheme('dark');
      if (saved[KEYS.language]) setLang(saved[KEYS.language] as 'en' | 'ar');
      if (saved[KEYS.stepTracking] !== null) setStepTracking(saved[KEYS.stepTracking] === 'true');
      if (saved[KEYS.autoSync] !== null) setAutoSync(saved[KEYS.autoSync] === 'true');
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

      progressRef.current = { steps: savedSteps, points: savedPoints, xp: savedXp };
      setSteps(savedSteps);
      setPoints(savedPoints);
      setXp(savedXp);
    } catch (e) { console.log(e); }
  };

  const persistProgress = async () => {
    try {
      await AsyncStorage.multiSet([
        [KEYS.totalSteps, progressRef.current.steps.toString()],
        [KEYS.points, progressRef.current.points.toString()],
        [KEYS.xp, progressRef.current.xp.toString()],
      ]);
    } catch (e) { console.log(e); }
  };

  /**
   * Add newly walked steps. Points/XP are earned at the single global rate
   * (lib/config.ts): every STEPS_PER_POINT lifetime steps earns 1 point.
   */
  const addSteps = (count: number) => {
    if (!count || count <= 0) return;
    const prev = progressRef.current;
    const newSteps = prev.steps + count;
    const earnedDelta = stepsToPoints(newSteps) - stepsToPoints(prev.steps);
    progressRef.current = {
      steps: newSteps,
      points: prev.points + earnedDelta,
      xp: prev.xp + earnedDelta,
    };
    setSteps(progressRef.current.steps);
    setPoints(progressRef.current.points);
    setXp(progressRef.current.xp);
    persistProgress();
  };

  /** Deduct points for a redemption. Returns false if the balance is too low. */
  const spendPoints = (cost: number): boolean => {
    if (cost <= 0) return false;
    if (progressRef.current.points < cost) return false;
    progressRef.current = { ...progressRef.current, points: progressRef.current.points - cost };
    setPoints(progressRef.current.points);
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
  const togglePushNotifications = makeToggle(pushNotifications, setPushNotifications, KEYS.pushNotifications);
  const toggleDhikrReminders = makeToggle(dhikrReminders, setDhikrReminders, KEYS.dhikrReminders);
  const toggleSoundEnabled = makeToggle(soundEnabled, setSoundEnabled, KEYS.soundEnabled);

  const changeLanguage = async (lang: 'en' | 'ar') => {
    setLang(lang);
    await AsyncStorage.setItem(KEYS.language, lang);
  };

  const t = (key: string) => translations[language]?.[key] || key;

  return (
    <AppContext.Provider value={{
      theme, language, stepTracking, autoSync, pushNotifications, dhikrReminders, soundEnabled,
      steps, points, xp, level,
      toggleTheme, toggleStepTracking, toggleAutoSync, togglePushNotifications,
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
