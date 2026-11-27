import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { AppProvider } from './context/AppContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { supabase } from '../lib/supabase';
import { ONBOARDING_SEEN_KEY } from '../lib/config';
import { initSentry, wrapWithSentry } from '../lib/sentry';
import {
  addNotificationTapListener,
  getColdStartNotificationRoute,
  initNotificationHandler,
} from '../lib/notifications';

// Crash reporting: a no-op unless EXPO_PUBLIC_SENTRY_DSN is set.
// Notification handler: how notifications present in the foreground.
initSentry();
initNotificationHandler();

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
  /** Route requested by a notification tap, waiting for the auth gate. */
  const pendingNotifRouteRef = useRef<string | null>(null);

  // Notification taps: warm taps navigate immediately; a tap that
  // cold-started the app is held until the gate lets the user in, then
  // honoured once (see the navigation effect below).
  useEffect(() => {
    const sub = addNotificationTapListener((route) => {
      pendingNotifRouteRef.current = route;
      router.push(route as any);
    });
    getColdStartNotificationRoute().then((route) => {
      if (route) pendingNotifRouteRef.current = route;
    });
    return () => sub.remove();
  }, [router]);

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
      return;
    }

    // Signed in and inside the app: honour a cold-start notification
    // route exactly once (warm taps navigate directly in the listener).
    const pendingRoute = pendingNotifRouteRef.current;
    if (pendingRoute && route !== undefined) {
      pendingNotifRouteRef.current = null;
      if (!segments.join('/').includes(pendingRoute.replace(/^\//, ''))) {
        router.push(pendingRoute as any);
      }
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

function RootLayout() {
  return (
    <AppProvider>
      <AppErrorBoundary>
        <AuthGate />
      </AppErrorBoundary>
    </AppProvider>
  );
}

// Wrapped with Sentry's error handling only when a DSN is configured;
// otherwise this is the plain component (lib/sentry.ts).
export default wrapWithSentry(RootLayout);
