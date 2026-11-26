# ⚠️ SECURITY TODO — action required by the project owner

This repository is **public**, and API keys were previously committed in
plain text inside the source code. Treat every key that ever appeared in
this repo's history as **compromised** — removing it from the latest code
does not remove it from Git history.

## Do these NOW (before any store release)

1. **Rotate the exposed keys in the Supabase dashboard**
   - The old self-hosted client (`app/lib/supabase.ts`, now deleted) contained
     a full `anon` JWT for a DatabasePad-hosted Supabase instance. That
     backend is no longer used by the app, but if the instance still exists,
     **rotate/reset its JWT secret** (or shut the instance down).
   - The cloud project key in `lib/supabase.ts` (publishable key) was also in
     the public repo. Publishable/anon keys are designed to be embedded in
     apps, so rotation is less urgent — but if you want a clean start,
     create a new key in Project Settings → API and put it in `.env`
     (see `.env.example`). Never commit the real value.

2. **Verify Row Level Security (RLS) on EVERY table**
   The anon key is only safe if RLS is enabled and policies restrict rows
   to their owner. In the Supabase dashboard (Authentication → Policies /
   Table Editor), confirm RLS is **ON** for at least:
   - `daily_steps` — users may select/insert/update only rows where
     `user_id = auth.uid()`.
   - `redemptions` — users may select/insert only their own rows.
   A ready-to-run schema with these policies lives in `supabase/schema.sql`.

3. **Check for other leaks**
   Search the repo history for anything else sensitive (service-role keys
   must NEVER appear in a mobile app or a public repo):
   `git log -p | grep -i "service_role"` — if a service-role key ever
   leaked, rotate it immediately; it bypasses RLS entirely.

4. **Keep it that way**
   - All configuration now comes from `.env` (git-ignored). Use
     `.env.example` as the template.
   - Before making the repo public again after any change, re-check that
     no `.env` file or key material is staged: `git status` / `git diff --cached`.

## Notes

- The app now fails gracefully when env vars are missing: it logs a clear
  console error and runs in local-only mode (no auth, no cloud sync).
- Social sign-in (Google/Apple) stays disabled until the providers are
  configured in the Supabase dashboard and the matching
  `EXPO_PUBLIC_*_AUTH_ENABLED` flag is set to `true` in `.env`.
