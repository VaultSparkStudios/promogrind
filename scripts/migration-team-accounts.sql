-- ============================================================
-- Team Accounts: shared vault for groups of bettors
-- Activates the $49.99/mo Team tier
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists team_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  plan text default 'team',
  created_at timestamptz default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references team_accounts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  invited_email text,
  role text default 'member', -- 'owner' | 'member'
  status text default 'pending', -- 'pending' | 'active'
  created_at timestamptz default now(),
  unique(team_id, user_id)
);

-- RLS
alter table team_accounts enable row level security;
alter table team_members enable row level security;

-- Owners can fully manage their teams
create policy "team_accounts_owner"
  on team_accounts for all
  using (auth.uid() = owner_id);

-- Members can view teams they belong to
create policy "team_members_read"
  on team_members for select
  using (
    auth.uid() = user_id or
    team_id in (select id from team_accounts where owner_id = auth.uid())
  );

-- Only team owners can insert/update/delete members
create policy "team_members_owner_write"
  on team_members for all
  using (
    team_id in (select id from team_accounts where owner_id = auth.uid())
  );

-- Members can update their own status (accept invite)
create policy "team_members_self_update"
  on team_members for update
  using (auth.uid() = user_id);
