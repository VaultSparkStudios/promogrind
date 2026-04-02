-- ============================================================
-- Wins Wall: server-backed community profit opt-ins
-- Powers the "Wins Wall" section on the Dashboard
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists wins_wall (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  period text not null,           -- 'week' | 'month' | 'all-time'
  period_label text not null,     -- human-readable e.g. "Week of 3/25 – 4/1"
  total numeric not null,         -- profit amount
  entry_count int not null,       -- number of ledger entries
  book_count int not null,        -- number of distinct books
  display_name text,              -- optional user-chosen alias (null = anonymous)
  is_approved boolean not null default true,   -- moderation flag
  created_at timestamptz default now()
);

create index if not exists wins_wall_created_idx on wins_wall(created_at desc);
create index if not exists wins_wall_user_idx on wins_wall(user_id);

alter table wins_wall enable row level security;

-- Anyone authed can read approved entries
create policy "wins_wall_read"
  on wins_wall for select
  using (is_approved = true);

-- Users can insert their own entries
create policy "wins_wall_insert"
  on wins_wall for insert
  with check (auth.uid() = user_id);

-- Users can delete their own entries
create policy "wins_wall_delete"
  on wins_wall for delete
  using (auth.uid() = user_id);

-- Rate limit: max 3 entries per user per day (enforced via app, not SQL)
-- Moderation: set is_approved = false to hide entries
