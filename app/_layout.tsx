import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { AppProvider } from './context/AppContext';
import { supabase } from '../lib/supabase';
import { ONBOARDING_SEEN_KEY } from '../lib/config';

// Routes reachable without a session (after onboarding has been seen).
const PUBLIC_ROUTES = new Set(['login', 'onboarding', 'privacy', 'terms_of_service', 'info-page']);

/**
 * Auth gate:
 *  - First run ever → onboarding (flag persisted in AsyncStorage).
 *  - No session → only the splash (index), login and legal pages are
 *    reachable; everything else redirects to /login.
 *  - Active session (persisted by the Supabase client via AsyncStorage) →
 *    the user is routed straight into the app and kept out of the
 *    login/onboarding/splash screens.
 */
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [sessionRes, seen] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem(ONBOARDING_SEEN_KEY),
      ]);
      if (!mounted) return;
      setSession(sessionRes.data.session);
      setOnboardingSeen(seen === 'true');
      setReady(true);
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // The onboarding screen sets the flag itself when finished/skipped;
  // re-read it on navigation changes so the gate reacts immediately.
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY).then((value) => {
      setOnboardingSeen(value === 'true');
    });
  }, [segments]);

  useEffect(() => {
    if (!ready) return;
    const route = segments[0] as string | undefined; // undefined === index splash

    if (!onboardingSeen) {
      if (route !== 'onboarding') router.replace('/onboarding');
      return;
    }

    if (!session) {
      if (route !== undefined && !PUBLIC_ROUTES.has(route)) {
        router.replace('/login');
      }
      return;
    }

    if (route === undefined || route === 'login' || route === 'onboarding') {
      router.replace('/(tabs)/home');
    }
  }, [ready, session, onboardingSeen, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="achievements" />
      <Stack.Screen name="history" />
      <Stack.Screen name="media" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="personal_details" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms_of_service" />
      <Stack.Screen name="info-page" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <AuthGate />
    </AppProvider>
  );
}
