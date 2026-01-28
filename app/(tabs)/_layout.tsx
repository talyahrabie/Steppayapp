import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

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
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarLabel: t('nav_activity'), // استخدام الترجمة
          tabBarIcon: ({ color, size }) => <Ionicons name="fitness" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          tabBarLabel: t('nav_rewards'), // استخدام الترجمة
          tabBarIcon: ({ color, size }) => <Ionicons name="gift" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: t('nav_profile'), // استخدام الترجمة
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}