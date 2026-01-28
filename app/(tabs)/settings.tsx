import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar,
  TouchableOpacity, Switch, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';

interface SettingItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: 'toggle' | 'link' | 'select';
  value?: boolean;
  description?: string;
  onPress?: () => void;
  color?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, language, stepTracking, toggleTheme, toggleStepTracking, changeLanguage, t, colors } = useApp();
  const isDark = theme === 'dark';

  const [autoSync, setAutoSync] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [dhikr, setDhikr] = useState(true);
  const [sound, setSound] = useState(true);

  const handleLanguageChange = () => {
    Alert.alert(t('language'), "Choose / اختر", [
      { text: "English", onPress: () => changeLanguage('en') },
      { text: "العربية", onPress: () => changeLanguage('ar') },
      { text: t('cancel'), style: 'cancel' }
    ]);
  };

  // 1. عام (مترجم)
  const generalSettings: SettingItem[] = [
    {
      id: 'tracking',
      label: t('step_tracking'),
      icon: 'footsteps',
      type: 'toggle',
      value: stepTracking,
      onPress: toggleStepTracking,
      description: stepTracking ? t('step_tracking_desc_on') : t('step_tracking_desc_off'),
      color: '#4CAF50'
    },
    {
      id: 'sync',
      label: t('auto_sync'),
      icon: 'sync',
      type: 'toggle',
      value: autoSync,
      onPress: () => setAutoSync(!autoSync),
      description: t('auto_sync_desc'),
      color: '#2196F3'
    },
  ];

  // 2. الإشعارات (مترجم)
  const notificationSettings: SettingItem[] = [
    {
      id: 'notif',
      label: t('push_notif'),
      icon: 'notifications',
      type: 'toggle',
      value: pushNotif,
      onPress: () => setPushNotif(!pushNotif),
      description: t('push_notif_desc'),
      color: '#FF9800'
    },
    {
      id: 'dhikr',
      label: t('dhikr'),
      icon: 'book',
      type: 'toggle',
      value: dhikr,
      onPress: () => setDhikr(!dhikr),
      description: t('dhikr_desc'),
      color: '#009688'
    },
    {
      id: 'sound',
      label: t('sound'),
      icon: 'volume-high',
      type: 'toggle',
      value: sound,
      onPress: () => setSound(!sound),
      description: t('sound_desc'),
      color: '#673AB7'
    }
  ];

  // 3. المظهر (مترجم)
  const appearanceSettings: SettingItem[] = [
    {
      id: 'darkmode',
      label: t('dark_mode'),
      icon: 'moon',
      type: 'toggle',
      value: isDark,
      onPress: toggleTheme,
      description: isDark ? t('dark_mode_active') : t('dark_mode_inactive'),
      color: '#607D8B'
    },
    {
      id: 'lang',
      label: t('language'),
      icon: 'language',
      type: 'select',
      description: language === 'en' ? 'English' : 'العربية',
      onPress: handleLanguageChange,
      color: '#3F51B5'
    },
    {
      id: 'units',
      label: t('units'),
      icon: 'speedometer',
      type: 'select',
      description: t('units_desc'),
      onPress: () => Alert.alert(t('units'), t('units_desc')),
      color: '#E91E63'
    }
  ];

  // 4. أخرى (مترجم)
  const otherSettings: SettingItem[] = [
    { id: 'privacy', label: t('privacy'), icon: 'shield-checkmark', type: 'link', onPress: () => router.push('/privacy'), color: '#2196F3' },
    { id: 'terms', label: t('terms'), icon: 'document-text', type: 'link', onPress: () => router.push('/terms_of_service'), color: '#607D8B' },
    { id: 'about', label: t('about'), icon: 'information-circle', type: 'link', onPress: () => router.push('/info-page'), color: '#9C27B0' },
    { id: 'rate', label: t('rate'), icon: 'star', type: 'link', onPress: () => Alert.alert(t('rate'), "Coming soon on Store!"), color: '#FFC107' },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.settingItem, { borderBottomColor: colors.border }]}
      onPress={item.type === 'toggle' ? item.onPress : item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}> 
          <Ionicons name={item.icon} size={22} color={item.color || colors.icon} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingLabel, { color: colors.text, textAlign: language === 'ar' ? 'right' : 'left' }]}>{item.label}</Text>
          {item.description && (
            <Text style={[styles.settingDescription, { color: colors.subText, textAlign: language === 'ar' ? 'right' : 'left' }]}>{item.description}</Text>
          )}
        </View>
      </View>
      
      {item.type === 'toggle' ? (
        <Switch
          value={item.value}
          onValueChange={item.onPress}
          trackColor={{ false: '#E0E0E0', true: item.color || '#81C784' }}
        />
      ) : (
        <View style={{flexDirection: language === 'ar' ? 'row-reverse' : 'row', alignItems: 'center'}}>
           <Text style={{color: colors.subText, marginHorizontal: 5, fontSize: 12}}>{item.description}</Text>
           <Ionicons name={language === 'ar' ? "chevron-back" : "chevron-forward"} size={20} color={colors.subText} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: SettingItem[]) => (
    <View style={styles.section} key={title}>
      <Text style={[styles.sectionTitle, { color: colors.subText, textAlign: language === 'ar' ? 'right' : 'left' }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
        {items.map((item) => renderSettingItem(item))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginHorizontal: 10 }}>
            <Ionicons name={language === 'ar' ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings_title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderSection(t('sec_general'), generalSettings)}
        {renderSection(t('sec_notifications'), notificationSettings)}
        {renderSection(t('sec_appearance'), appearanceSettings)}
        {renderSection(t('sec_other'), otherSettings)}
        
        <TouchableOpacity
          style={[styles.deleteButton, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}
          onPress={() => Alert.alert(t('delete_account'), t('delete_confirm'))}
        >
          <Ionicons name="trash-outline" size={20} color="#E53935" />
          <Text style={styles.deleteText}>{t('delete_account')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>StePPay v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, elevation: 2, shadowOpacity: 0.1
  },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  scrollContent: { paddingVertical: 20 },
  section: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 20, letterSpacing: 1
  },
  sectionContent: {
    marginHorizontal: 20, borderRadius: 16, overflow: 'hidden',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '500' },
  settingDescription: { fontSize: 12, marginTop: 3 },
  deleteButton: {
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFEBEE', borderRadius: 16, gap: 8, marginTop: 10,
  },
  deleteText: { fontSize: 16, fontWeight: '600', color: '#D32F2F' },
  versionText: { textAlign: 'center', color: '#AAA', marginTop: 20, marginBottom: 30, fontSize: 12 }
});