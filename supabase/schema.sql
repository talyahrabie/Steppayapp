-- ─────────────────────────────────────────────────────────────────────────────
-- StePPay database schema (cloud Supabase project).
--
-- Run this in the Supabase dashboard: SQL Editor → New query → paste →
-- Run. It creates the tables the app expects (`daily_steps`,
-- `redemptions`, `step_flags`, `user_push_tokens`, `analytics_events`)
-- and locks them down with Row Level Security so the public anon key
-- can only ever touch the signed-in user's own rows.
--
-- The whole file is IDEMPOTENT (create-if-not-exists / drop-policy-
-- if-exists throughout), so it is safe — and REQUIRED — to re-run it
-- whenever a new section is added. In particular, the `step_flags`
-- section (anti-cheat, Phase 1 Batch A) and the `user_push_tokens` +
-- `analytics_events` sections (Phase 1 Batch B) must be run by the
-- owner on existing installs: until then the app keeps flags queued
-- locally and retries, push tokens simply are not registered, and
-- analytics batches are dropped — nothing breaks and nothing is
-- double-counted, but the server sees nothing.
--
-- NOTE on remote push (Batch B): the app only REGISTERS Expo push
-- tokens into `user_push_tokens`. Actually SENDING a remote push needs
-- a sender outside the app — a Supabase Edge Function (or an EAS-side
-- job) that reads this table and calls the Expo Push Service with the
-- user's token. That sender is an owner infrastructure step for later;
-- local notifications (daily reminder, goal congratulation) need no
-- server at all and already work.
--
-- Column names/types match exactly what the app sends:
--   lib/stepHistory.ts   → daily_steps upsert (on conflict user_id, date)
--   lib/redemptions.ts   → redemptions upsert (on conflict user_id, client_id)
--   lib/stepHistory.ts   → step_flags upsert (on conflict user_id, client_id)
--   lib/notifications.ts → user_push_tokens upsert (on conflict user_id, token)
--   lib/analytics.ts     → analytics_events insert (batched)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.daily_steps (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          date not null,
  steps         integer not null default 0,
  distance_km   numeric(10, 2) not null default 0,
  calories      integer not null default 0,
  points_earned integer not null default 0,
  goal_reached  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.redemptions (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  reward_id     text not null,
  reward_title  text not null,
  points_spent  integer not null,
  -- Client-generated idempotency id: the app upserts on
  -- (user_id, client_id), so a retried sync can never duplicate a row.
  client_id     text,
  created_at    timestamptz not null default now()
);

-- For installs created before client_id existed (safe to re-run):
alter table public.redemptions add column if not exists client_id text;
create unique index if not exists redemptions_user_client_uidx
  on public.redemptions (user_id, client_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.daily_steps enable row level security;
alter table public.redemptions enable row level security;

-- daily_steps: full access to your own rows only.
drop policy if exists "daily_steps: select own" on public.daily_steps;
create policy "daily_steps: select own"
  on public.daily_steps for select
  using (auth.uid() = user_id);

drop policy if exists "daily_steps: insert own" on public.daily_steps;
create policy "daily_steps: insert own"
  on public.daily_steps for insert
  with check (auth.uid() = user_id);

drop policy if exists "daily_steps: update own" on public.daily_steps;
create policy "daily_steps: update own"
  on public.daily_steps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- redemptions: read + create your own rows only (records are immutable).
drop policy if exists "redemptions: select own" on public.redemptions;
create policy "redemptions: select own"
  on public.redemptions for select
  using (auth.uid() = user_id);

drop policy if exists "redemptions: insert own" on public.redemptions;
create policy "redemptions: insert own"
  on public.redemptions for insert
  with check (auth.uid() = user_id);

-- ── Anti-cheat step flags (Phase 1, Batch A) ────────────────────────────────
-- One row per batch of steps the on-device plausibility gate withheld
-- from crediting (lib/antiCheat.ts): the day total crossed the daily cap
-- ('day_cap_exceeded') or the steps arrived faster than a human can
-- move ('rate_exceeded'). Rows are for SERVER REVIEW of the rewards
-- economy — the app only ever reads its own flags back and inserts new
-- ones; flags are immutable once written.
create table if not exists public.step_flags (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  date           date not null,
  reason         text not null check (reason in ('day_cap_exceeded', 'rate_exceeded')),
  reported_steps integer not null,
  credited_steps integer not null,
  flagged_steps  integer not null,
  -- Client-generated idempotency id (the flag's own id): the app upserts
  -- on (user_id, client_id), so a retried sync can never duplicate a row.
  client_id      text,
  created_at     timestamptz not null default now()
);

create unique index if not exists step_flags_user_client_uidx
  on public.step_flags (user_id, client_id);
create index if not exists step_flags_user_date_idx
  on public.step_flags (user_id, date);

alter table public.step_flags enable row level security;

-- step_flags: read + create your own rows only (records are immutable).
drop policy if exists "step_flags: select own" on public.step_flags;
create policy "step_flags: select own"
  on public.step_flags for select
  using (auth.uid() = user_id);

drop policy if exists "step_flags: insert own" on public.step_flags;
create policy "step_flags: insert own"
  on public.step_flags for insert
  with check (auth.uid() = user_id);

-- The sync upsert's ON CONFLICT path performs an UPDATE, so retried
-- syncs need an update policy too (same shape as daily_steps).
drop policy if exists "step_flags: update own" on public.step_flags;
create policy "step_flags: update own"
  on public.step_flags for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Expo push tokens (Phase 1, Batch B) ────────────────────────────────────
-- One row per (user, device token): lib/notifications.ts upserts the
-- device's Expo push token after sign-in and whenever Expo rotates it.
-- A future server-side sender (Edge Function / EAS job — see the header
-- note) reads these rows to deliver remote pushes; the app itself only
-- ever writes and reads its own tokens.
create table if not exists public.user_push_tokens (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  token      text not null,
  platform   text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists user_push_tokens_user_idx
  on public.user_push_tokens (user_id);

alter table public.user_push_tokens enable row level security;

drop policy if exists "user_push_tokens: select own" on public.user_push_tokens;
create policy "user_push_tokens: select own"
  on public.user_push_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "user_push_tokens: insert own" on public.user_push_tokens;
create policy "user_push_tokens: insert own"
  on public.user_push_tokens for insert
  with check (auth.uid() = user_id);

-- The registration upsert's ON CONFLICT path performs an UPDATE.
drop policy if exists "user_push_tokens: update own" on public.user_push_tokens;
create policy "user_push_tokens: update own"
  on public.user_push_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Product analytics events (Phase 1, Batch B) ────────────────────────────
-- Batched, privacy-light usage events from lib/analytics.ts (app_open,
-- session_start, steps_goal_reached, reward_redeemed, media_played,
-- health_sync_enabled). Props are flat primitives and never contain
-- PII. user_id is NULL for pre-sign-in events (e.g. app_open).
--
-- RLS is INSERT-ONLY: the app can append events for itself (or
-- anonymously) but can never read, update or delete them — analysis
-- happens from the dashboard/service role, not from the client.
create table if not exists public.analytics_events (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users (id) on delete set null,
  event      text not null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at);
create index if not exists analytics_events_event_created_idx
  on public.analytics_events (event, created_at);

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_events: insert own or anonymous" on public.analytics_events;
create policy "analytics_events: insert own or anonymous"
  on public.analytics_events for insert
  with check (user_id is null or auth.uid() = user_id);

