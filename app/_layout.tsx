import { Stack } from 'expo-router';
import { AppProvider } from './context/AppContext'; 
// لاحظ: نقطة واحدة ./ لأننا في المجلد الرئيسي

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </AppProvider>
  );
}