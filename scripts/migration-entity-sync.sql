-- ============================================================
-- Ledger + Tracker Entity Sync
-- Splits ledger and tracker persistence away from the shared
-- promogrind_data blob while preserving user-owned sync state.
-- Run in Supabase SQL Editor
-- ============================================================

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

create policy "ledger_state_read_own"
  on ledger_state for select
  using (auth.uid() = user_id);

create policy "ledger_state_insert_own"
  on ledger_state for insert
  with check (auth.uid() = user_id);

create policy "ledger_state_update_own"
  on ledger_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ledger_state_delete_own"
  on ledger_state for delete
  using (auth.uid() = user_id);

create policy "tracker_state_read_own"
  on tracker_state for select
  using (auth.uid() = user_id);

create policy "tracker_state_insert_own"
  on tracker_state for insert
  with check (auth.uid() = user_id);

create policy "tracker_state_update_own"
  on tracker_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tracker_state_delete_own"
  on tracker_state for delete
  using (auth.uid() = user_id);
