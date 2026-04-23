-- ============================================================
-- Workflow State + History
-- Durable workflow persistence for inbox ranking, lifecycle
-- history, and cross-device provenance.
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists workflow_state (
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
  on workflow_state(user_id, workflow_id);

create index if not exists workflow_state_user_updated_idx
  on workflow_state(user_id, updated_at desc);

create index if not exists workflow_state_user_status_idx
  on workflow_state(user_id, status);

create table if not exists workflow_history (
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
  on workflow_history(event_key);

create index if not exists workflow_history_user_event_idx
  on workflow_history(user_id, event_at desc);

create index if not exists workflow_history_user_workflow_idx
  on workflow_history(user_id, workflow_id, event_at desc);

alter table workflow_state add column if not exists execution_minutes numeric;
alter table workflow_state add column if not exists would_repeat text;
alter table workflow_history add column if not exists execution_minutes numeric;
alter table workflow_history add column if not exists would_repeat text;

alter table workflow_state enable row level security;
alter table workflow_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_state' and policyname = 'workflow_state_read_own'
  ) then
    create policy "workflow_state_read_own"
      on workflow_state for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_state' and policyname = 'workflow_state_insert_own'
  ) then
    create policy "workflow_state_insert_own"
      on workflow_state for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_state' and policyname = 'workflow_state_update_own'
  ) then
    create policy "workflow_state_update_own"
      on workflow_state for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_state' and policyname = 'workflow_state_delete_own'
  ) then
    create policy "workflow_state_delete_own"
      on workflow_state for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_history' and policyname = 'workflow_history_read_own'
  ) then
    create policy "workflow_history_read_own"
      on workflow_history for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_history' and policyname = 'workflow_history_insert_own'
  ) then
    create policy "workflow_history_insert_own"
      on workflow_history for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_history' and policyname = 'workflow_history_update_own'
  ) then
    create policy "workflow_history_update_own"
      on workflow_history for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workflow_history' and policyname = 'workflow_history_delete_own'
  ) then
    create policy "workflow_history_delete_own"
      on workflow_history for delete
      using (auth.uid() = user_id);
  end if;
end $$;
