import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase, isSupabaseConfigured } from './supabase';

// Required so the browser session returns control to the app on web/Expo Go.
WebBrowser.maybeCompleteAuthSession();

// ─────────────────────────────────────────────────────────────────────────────
// Social sign-in (Google / Apple) via Supabase OAuth.
//
// The providers must be enabled in the Supabase dashboard
// (Authentication → Providers) with the provider's own credentials — those
// credentials live in Supabase, NOT in this app. On top of that, each
// provider is gated behind an env flag so the buttons can honestly say
// "not configured yet" instead of pretending to work:
//
//   EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true
//   EXPO_PUBLIC_APPLE_AUTH_ENABLED=true
//
// Redirect URL to whitelist in the Supabase dashboard:
//   steppay://auth-callback   (the app scheme from app.json + path below)
// ─────────────────────────────────────────────────────────────────────────────

export type SocialProvider = 'google' | 'apple';

export type SocialAuthResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'not-configured' }
  | { status: 'error'; message: string };

const ENV_FLAGS: Record<SocialProvider, string> = {
  google: 'EXPO_PUBLIC_GOOGLE_AUTH_ENABLED',
  apple: 'EXPO_PUBLIC_APPLE_AUTH_ENABLED',
};

/** True when Supabase is configured AND the provider's env flag is on. */
export function isSocialAuthEnabled(provider: SocialProvider): boolean {
  return isSupabaseConfigured && process.env[ENV_FLAGS[provider]] === 'true';
}

/** Extract OAuth params from a redirect URL (query string or hash fragment). */
function extractParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parseInto = (raw: string) => {
    raw.split('&').forEach((pair) => {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        const key = decodeURIComponent(pair.slice(0, idx));
        const value = decodeURIComponent(pair.slice(idx + 1));
        if (!(key in params)) params[key] = value;
      }
    });
  };
  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) parseInto(url.slice(hashIndex + 1));
  const queryIndex = url.indexOf('?');
  if (queryIndex >= 0 && (hashIndex === -1 || queryIndex < hashIndex)) {
    parseInto(url.slice(queryIndex + 1, hashIndex === -1 ? undefined : hashIndex));
  }
  return params;
}

/**
 * Run the OAuth flow for a provider in the system browser and, on success,
 * store the resulting session in the Supabase client (the root layout's
 * auth listener then routes the user into the app).
 *
 * NOTE (Apple): this is the web OAuth flow, which works on iOS through
 * ASWebAuthenticationSession. For a production App Store release Apple
 * requires Sign in with Apple to be offered natively; keep this flow gated
 * behind EXPO_PUBLIC_APPLE_AUTH_ENABLED until the Apple provider is fully
 * configured in both the Apple Developer portal and Supabase.
 */
export async function signInWithSocialProvider(
  provider: SocialProvider
): Promise<SocialAuthResult> {
  if (!isSocialAuthEnabled(provider)) {
    return { status: 'not-configured' };
  }

  try {
    const redirectTo = Linking.createURL('auth-callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) return { status: 'error', message: error.message };
    if (!data?.url) return { status: 'error', message: 'No authorization URL returned.' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      return { status: 'cancelled' };
    }

    const params = extractParams(result.url);

    // PKCE flow: an authorization code is returned and exchanged for a session.
    if (params.code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
      if (exchangeError) return { status: 'error', message: exchangeError.message };
      return { status: 'success' };
    }

    // Implicit flow: tokens are returned directly in the URL fragment.
    if (params.access_token && params.refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (sessionError) return { status: 'error', message: sessionError.message };
      return { status: 'success' };
    }

    if (params.error_description || params.error) {
      return { status: 'error', message: params.error_description || params.error };
    }

    return { status: 'error', message: 'No session was returned by the provider.' };
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Unexpected authentication error.',
    };
  }
}

/** Send a password-reset email for the given address. */
export async function sendPasswordResetEmail(email: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    return { error: 'Authentication is not configured yet.' };
  }
  const redirectTo = Linking.createURL('reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return error ? { error: error.message } : {};
}
