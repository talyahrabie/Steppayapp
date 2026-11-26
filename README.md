# StePPay — Walk & Earn

**StePPay** turns your daily steps into points, levels and real rewards.
Walk, stay healthy, and redeem your points for gift cards, discounts and
donations — with exercises, relaxation content, Quran/audio streaming and
daily adhkar built in.

Built with **Expo SDK 54 · React Native 0.81 · TypeScript · Expo Router ·
Supabase**.

## Features

- **Real step tracking** — the device pedometer feeds one shared engine:
  steps → points → XP/levels → achievements, all at a single conversion
  rate (100 steps = 1 point, see `lib/config.ts`).
- **Rewards store** — redeem points for gift cards, discounts and
  donations; every redemption deducts your balance and is recorded
  locally and in the database.
- **Activity history** — real daily/weekly/monthly history from your own
  recorded steps (no placeholder data), synced to your account.
- **Accounts** — email sign-up/sign-in with persistent sessions
  (Supabase Auth), password reset, and optional Google/Apple social
  sign-in once configured.
- **Content** — exercises, relaxation and nutrition cards, adhkar with an
  interactive dhikr counter, and audio streaming (Quran & motivation).
- **Arabic & English UI**, light/dark themes, all settings persisted.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

The app reads its backend configuration from a `.env` file (never commit
real keys):

```bash
cp .env.example .env
```

Then fill in your Supabase project's values (Supabase dashboard →
Project Settings → API):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Without these, the app still runs in local-only mode (no sign-in, no
cloud sync) and logs a clear console warning.

### 3. Set up the database (once)

In the Supabase dashboard → SQL Editor, run
[`supabase/schema.sql`](supabase/schema.sql). It creates the `daily_steps`
and `redemptions` tables and enables Row Level Security policies that
restrict every user to their own rows. **Do not skip this step** — see
[`SECURITY-TODO.md`](SECURITY-TODO.md) for the full pre-release security
checklist, including rotating keys that were previously exposed in this
repository's history.

### 4. Run the app

```bash
npx expo start
```

Then open it in a development build, an emulator/simulator, or Expo Go.
Step counting requires a physical device (or a sensor-capable emulator);
on devices without a pedometer the app honestly reports the sensor as
unavailable instead of inventing steps.

## Social sign-in (optional)

Google/Apple buttons stay in a "not configured yet" state until you:

1. Enable the provider in Supabase (Authentication → Providers) with the
   provider's own credentials.
2. Whitelist the redirect URL `steppay://auth-callback`.
3. Set `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true` (or
   `EXPO_PUBLIC_APPLE_AUTH_ENABLED=true`) in `.env` and restart Expo.

## Building for release (EAS)

```bash
# Android APK (production profile in eas.json)
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

## Project structure

```
app/
  (tabs)/        Home, Activity, Rewards, Profile, Settings
  context/       AppContext — theme, language, points economy, settings
  hooks/         usePedometer — the single step-tracking engine
  components/    StepCounter, DhikrReminder, cards, charts…
  *.tsx          Onboarding, Login, History, Media, Achievements,
                 Notifications, Personal Details, Privacy, Terms
lib/
  supabase.ts    The single Supabase client (env-configured, persisted session)
  config.ts      Single source of truth for rates, goals and thresholds
  stepHistory.ts Daily step history (local store + Supabase sync)
  redemptions.ts Redemption recording (local + Supabase)
  auth.ts        Social OAuth + password-reset helpers
supabase/
  schema.sql     Tables + RLS policies for the cloud project
```

## Scripts

```bash
npm start          # Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on web
npm run lint       # ESLint
npx tsc --noEmit   # Type-check
```
