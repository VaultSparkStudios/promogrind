-- Copied from scripts/migration-entity-sync.sql for live Supabase db push.

create table if not exists ledger_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ledger jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists ledger_state_updated_idx
  on ledger_state(updated_at desc);

create table if not exists tracker_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tracker jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists tracker_state_updated_idx
  on tracker_state(updated_at desc);

alter table ledger_state enable row level security;
alter table tracker_state enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ledger_state' and policyname = 'ledger_state_read_own'
  ) then
    create policy "ledger_state_read_own"
      on ledger_state for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ledger_state' and policyname = 'ledger_state_insert_own'
  ) then
    create policy "ledger_state_insert_own"
      on ledger_state for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ledger_state' and policyname = 'ledger_state_update_own'
  ) then
    create policy "ledger_state_update_own"
      on ledger_state for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ledger_state' and policyname = 'ledger_state_delete_own'
  ) then
    create policy "ledger_state_delete_own"
      on ledger_state for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tracker_state' and policyname = 'tracker_state_read_own'
  ) then
    create policy "tracker_state_read_own"
      on tracker_state for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tracker_state' and policyname = 'tracker_state_insert_own'
  ) then
    create policy "tracker_state_insert_own"
      on tracker_state for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tracker_state' and policyname = 'tracker_state_update_own'
  ) then
    create policy "tracker_state_update_own"
      on tracker_state for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tracker_state' and policyname = 'tracker_state_delete_own'
  ) then
    create policy "tracker_state_delete_own"
      on tracker_state for delete
      using (auth.uid() = user_id);
  end if;
end $$;
