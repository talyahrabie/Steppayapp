import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// THE single Supabase client for the whole app (cloud project).
//
// Configuration comes from Expo public environment variables — never hardcode
// keys in source again (a full anon JWT was previously committed to this
// public repo in a second, duplicate client; see SECURITY-TODO.md).
//
//   1. Copy `.env.example` to `.env`
//   2. Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
//      from your Supabase dashboard (Project Settings → API)
//   3. Restart the Expo dev server (env vars are read at bundle time)
//
// The anon/publishable key is safe to ship in a mobile app ONLY when Row
// Level Security (RLS) is enabled on every table — verify this in the
// dashboard before publishing (see supabase/schema.sql).
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when both Supabase env vars are present. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Fail gracefully: the app still runs (local-only mode), but auth and
  // cloud sync are disabled until the env vars are provided.
  console.error(
    '[StePPay] Supabase is not configured. Copy .env.example to .env and set ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo. ' +
      'Authentication and cloud sync are disabled until then.'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      // Persist the session on the device so users stay signed in.
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Session is handled via the auth state listener, not URL parsing.
      detectSessionInUrl: false,
    },
  }
);
