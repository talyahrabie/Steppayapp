-- ─────────────────────────────────────────────────────────────────────────────
-- StePPay database schema (cloud Supabase project).
--
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste →
-- Run. It creates the tables the app expects (`daily_steps`, `redemptions`)
-- and locks them down with Row Level Security so the public anon key can
-- only ever touch the signed-in user's own rows.
--
-- Column names/types match exactly what the app sends:
--   lib/stepHistory.ts  → daily_steps upsert (on conflict user_id, date)
--   lib/redemptions.ts  → redemptions upsert (on conflict user_id, client_id)
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
