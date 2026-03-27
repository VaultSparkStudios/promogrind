-- ============================================================
-- Community Promos: user-submitted sportsbook promo database
-- Powers the "Community Promos" tab in the Learn group
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists community_promos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  book text not null,
  promo_name text not null,
  promo_type text not null,
    -- 'bonus_bet' | 'profit_boost' | 'parlay_insurance' | 'reload' | 'deposit_match' | 'other'
  value text not null,
    -- human-readable e.g. "$200 bonus bet" or "20% profit boost up to $50"
  expires_at timestamptz,
  state text,   -- 'NY' | 'NJ' | 'UK' | null = all states
  upvotes int not null default 0,
  is_approved boolean not null default true,  -- auto-approve; set false to soft-delete
  created_at timestamptz default now()
);

create index if not exists community_promos_book_idx on community_promos(book);
create index if not exists community_promos_state_idx on community_promos(state);
create index if not exists community_promos_upvotes_idx on community_promos(upvotes desc);

alter table community_promos enable row level security;

-- Anyone authed can read approved promos
create policy "community_promos_read"
  on community_promos for select
  using (is_approved = true and auth.uid() is not null);

-- Authed users can submit promos (user_id must match their own)
create policy "community_promos_insert"
  on community_promos for insert
  with check (auth.uid() = user_id);

-- Users can update their own submissions
create policy "community_promos_update_own"
  on community_promos for update
  using (auth.uid() = user_id);

-- Users can delete their own submissions
create policy "community_promos_delete_own"
  on community_promos for delete
  using (auth.uid() = user_id);

-- RPC: atomic upvote increment (bypasses RLS check on upvotes column)
create or replace function upvote_community_promo(promo_id uuid)
returns void
language sql
security definer
as $$
  update community_promos
  set upvotes = upvotes + 1
  where id = promo_id and is_approved = true;
$$;
