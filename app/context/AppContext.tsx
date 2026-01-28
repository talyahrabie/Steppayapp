import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AppContextType = {
  theme: 'light' | 'dark';
  language: 'en' | 'ar';
  stepTracking: boolean;
  steps: number; 
  xp: number;    
  level: string; 
  toggleTheme: () => void;
  toggleStepTracking: () => void;
  addSteps: (count: number) => void; 
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
    dark_mode: "Dark Mode",
    language: "Language",
    units: "Units",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    about: "About StePPay",
    rate: "Rate App",
    delete_account: "Delete Account",
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
    dark_mode: "الوضع الليلي",
    language: "اللغة",
    units: "الوحدات",
    privacy: "سياسة الخصوصية",
    terms: "شروط الخدمة",
    about: "عن StePPay",
    rate: "قيم التطبيق",
    delete_account: "حذف الحساب",
    badge_first_step: "الخطوة الأولى",
    badge_walker: "المشي السريع",
    badge_warrior: "بطل المسافات",
    badge_pro: "الرياضي المحترف",
    badge_desc: "خطوة",
    current_level: "مستواك الحالي"
  }
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLang] = useState<'en' | 'ar'>('en');
  const [stepTracking, setStepTracking] = useState(true);
  const [steps, setSteps] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState('Bronze');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (xp >= 5000) setLevel('Gold');
    else if (xp >= 2000) setLevel('Silver');
    else setLevel('Bronze');
  }, [xp]);

  const loadSettings = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('setting_darkmode');
      const savedLang = await AsyncStorage.getItem('setting_lang');
      const savedSteps = await AsyncStorage.getItem('user_total_steps');
      const savedXp = await AsyncStorage.getItem('user_xp');
      const savedTracking = await AsyncStorage.getItem('setting_step_tracking');

      if (savedTheme === 'true') setTheme('dark');
      if (savedLang) setLang(savedLang as 'en' | 'ar');
      if (savedSteps) setSteps(parseInt(savedSteps));
      if (savedXp) setXp(parseInt(savedXp));
      if (savedTracking !== null) setStepTracking(savedTracking === 'true');
    } catch (e) { console.log(e); }
  };

  const addSteps = async (count: number) => {
    const newSteps = steps + count;
    const newXp = xp + count;
    setSteps(newSteps);
    setXp(newXp);
    await AsyncStorage.setItem('user_total_steps', newSteps.toString());
    await AsyncStorage.setItem('user_xp', newXp.toString());
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await AsyncStorage.setItem('setting_darkmode', newTheme === 'dark' ? 'true' : 'false');
  };

  const toggleStepTracking = async () => {
    const newValue = !stepTracking;
    setStepTracking(newValue);
    await AsyncStorage.setItem('setting_step_tracking', newValue ? 'true' : 'false');
  };

  const changeLanguage = async (lang: 'en' | 'ar') => {
    setLang(lang);
    await AsyncStorage.setItem('setting_lang', lang);
  };

  const t = (key: string) => translations[language]?.[key] || key;

  return (
    <AppContext.Provider value={{ 
      theme, language, stepTracking, steps, xp, level,
      toggleTheme, toggleStepTracking, addSteps,
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