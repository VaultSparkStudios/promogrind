-- Reconcile live sync schema after backfilled migration-history repair.
-- Safe to run repeatedly.

create table if not exists public.ledger_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ledger jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists ledger_state_updated_idx
  on public.ledger_state(updated_at desc);

create table if not exists public.tracker_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tracker jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists tracker_state_updated_idx
  on public.tracker_state(updated_at desc);

create table if not exists public.workflow_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  workflow_id text not null,
  calculator_key text,
  calculator_slug text,
  calculator_label text,
  title text not null,
  summary text,
  promo_type text,
  status text not null,
  expected_profit numeric,
  actual_profit numeric,
  calculator_accurate text,
  book text,
  skip_reason text,
  friction_reason text,
  execution_minutes numeric,
  would_repeat text,
  confidence text,
  opportunity_score int,
  actionability int,
  next_step text,
  note text,
  source text not null default 'result_feedback',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workflow_state_user_workflow_idx
  on public.workflow_state(user_id, workflow_id);

create index if not exists workflow_state_user_updated_idx
  on public.workflow_state(user_id, updated_at desc);

create index if not exists workflow_state_user_status_idx
  on public.workflow_state(user_id, status);

create table if not exists public.workflow_history (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  workflow_id text not null,
  from_status text,
  status text not null,
  source text,
  title text,
  calculator_slug text,
  promo_type text,
  book text,
  expected_profit numeric,
  actual_profit numeric,
  execution_minutes numeric,
  would_repeat text,
  event_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists workflow_history_event_key_idx
  on public.workflow_history(event_key);

create index if not exists workflow_history_user_event_idx
  on public.workflow_history(user_id, event_at desc);

create index if not exists workflow_history_user_workflow_idx
  on public.workflow_history(user_id, workflow_id, event_at desc);

create table if not exists public.feature_flags (
  key varchar(100) primary key,
  enabled boolean not null default false,
  min_tier varchar(30) default null,
  cohort text[] default '{}',
  note text default '',
  updated_at timestamptz default now()
);

insert into public.feature_flags (key, enabled, min_tier, note) values
  ('aiScan', false, null, 'AI bet-slip scan via parse-bet-slip edge function'),
  ('promoAdvisor', false, 'free', 'Promo Advisor panel - enabled for all tiers'),
  ('promoChat', false, 'scout', 'PromoChat - Scout+ only'),
  ('liveScanner', false, 'closer', 'Live arbitrage scanner - Closer+ only'),
  ('stackBuilder', false, 'closer', 'Stack Builder - Closer+ only'),
  ('aiActionPlan', false, 'runner', 'AI Weekly Action Plan - Runner+ only'),
  ('pushAlerts', false, null, 'Browser push notification subscription flow'),
  ('paidCheckout', false, null, 'Stripe checkout for paid plans')
on conflict (key) do nothing;

alter table public.ledger_state enable row level security;
alter table public.tracker_state enable row level security;
alter table public.workflow_state enable row level security;
alter table public.workflow_history enable row level security;
alter table public.feature_flags enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ledger_state' and policyname = 'ledger_state_read_own'
  ) then
    create policy "ledger_state_read_own" on public.ledger_state for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ledger_state' and policyname = 'ledger_state_insert_own'
  ) then
    create policy "ledger_state_insert_own" on public.ledger_state for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ledger_state' and policyname = 'ledger_state_update_own'
  ) then
    create policy "ledger_state_update_own" on public.ledger_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ledger_state' and policyname = 'ledger_state_delete_own'
  ) then
    create policy "ledger_state_delete_own" on public.ledger_state for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tracker_state' and policyname = 'tracker_state_read_own'
  ) then
    create policy "tracker_state_read_own" on public.tracker_state for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tracker_state' and policyname = 'tracker_state_insert_own'
  ) then
    create policy "tracker_state_insert_own" on public.tracker_state for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tracker_state' and policyname = 'tracker_state_update_own'
  ) then
    create policy "tracker_state_update_own" on public.tracker_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tracker_state' and policyname = 'tracker_state_delete_own'
  ) then
    create policy "tracker_state_delete_own" on public.tracker_state for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_state' and policyname = 'workflow_state_read_own'
  ) then
    create policy "workflow_state_read_own" on public.workflow_state for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_state' and policyname = 'workflow_state_insert_own'
  ) then
    create policy "workflow_state_insert_own" on public.workflow_state for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_state' and policyname = 'workflow_state_update_own'
  ) then
    create policy "workflow_state_update_own" on public.workflow_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_state' and policyname = 'workflow_state_delete_own'
  ) then
    create policy "workflow_state_delete_own" on public.workflow_state for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_history' and policyname = 'workflow_history_read_own'
  ) then
    create policy "workflow_history_read_own" on public.workflow_history for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_history' and policyname = 'workflow_history_insert_own'
  ) then
    create policy "workflow_history_insert_own" on public.workflow_history for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_history' and policyname = 'workflow_history_update_own'
  ) then
    create policy "workflow_history_update_own" on public.workflow_history for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_history' and policyname = 'workflow_history_delete_own'
  ) then
    create policy "workflow_history_delete_own" on public.workflow_history for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feature_flags' and policyname = 'service_role_all'
  ) then
    create policy "service_role_all" on public.feature_flags for all to service_role using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feature_flags' and policyname = 'authenticated_read'
  ) then
    create policy "authenticated_read" on public.feature_flags for select to authenticated using (true);
  end if;
end $$;

create or replace function public.get_feature_flag(p_key text, p_user_id uuid, p_tier text)
returns boolean
language plpgsql
security definer
as $$
declare
  flag public.feature_flags%rowtype;
begin
  select * into flag from public.feature_flags where key = p_key;
  if not found then
    return false;
  end if;
  if not flag.enabled then
    return false;
  end if;
  if array_length(flag.cohort, 1) > 0 and not (p_user_id::text = any(flag.cohort)) then
    return false;
  end if;
  if flag.min_tier is not null then
    return case flag.min_tier
      when 'house' then p_tier in ('house')
      when 'closer' then p_tier in ('house', 'closer')
      when 'runner' then p_tier in ('house', 'closer', 'runner')
      when 'scout' then p_tier in ('house', 'closer', 'runner', 'scout')
      when 'free' then true
      else false
    end;
  end if;
  return true;
end;
$$;

notify pgrst, 'reload schema';
