import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

// RN 0.88 widened React Navigation's tint ColorValue to string | number | object | null.
// This app's tab tints are always theme strings, so pass strings through untouched
// and let Ionicons fall back to its default for anything else.
const asIconColor = (color: unknown): string | undefined =>
  typeof color === 'string' ? color : undefined;

export default function TabLayout() {
  // استدعاء دالة الترجمة t مع الألوان
  const { colors, t } = useApp();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.icon,
        tabBarInactiveTintColor: colors.subText,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: t('nav_home'), // استخدام الترجمة
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={asIconColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarLabel: t('nav_activity'), // استخدام الترجمة
          tabBarIcon: ({ color, size }) => <Ionicons name="fitness" size={size} color={asIconColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          tabBarLabel: t('nav_rewards'), // استخدام الترجمة
          tabBarIcon: ({ color, size }) => <Ionicons name="gift" size={size} color={asIconColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: t('nav_profile'), // استخدام الترجمة
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={asIconColor(color)} />,
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}