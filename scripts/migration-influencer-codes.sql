-- ============================================================
-- Influencer Codes: custom vanity referral codes for creators
-- Powers the "Creator Mode" section in ReferralHub
-- (VaultSparked-gated in the UI)
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists influencer_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  code text not null unique,  -- vanity slug e.g. "thegrinder" or "bradysbets"
  clicks int not null default 0,
  signups int not null default 0,
  created_at timestamptz default now()
);

create index if not exists influencer_codes_code_idx on influencer_codes(code);

alter table influencer_codes enable row level security;

-- Users can read and write their own code
create policy "influencer_codes_own"
  on influencer_codes for all
  using (auth.uid() = user_id);

-- Anyone can read a code entry (for landing page attribution lookup)
create policy "influencer_codes_read_public"
  on influencer_codes for select
  using (true);

-- RPC: look up a code by slug (for ?ref= attribution on page load)
create or replace function get_influencer_code(slug text)
returns table(user_id uuid, code text, clicks int, signups int)
language sql
security definer
as $$
  select user_id, code, clicks, signups
  from influencer_codes
  where code = slug
  limit 1;
$$;

-- RPC: increment click count (called on page load when ?ref=slug present)
create or replace function track_influencer_click(slug text)
returns void
language sql
security definer
as $$
  update influencer_codes set clicks = clicks + 1 where code = slug;
$$;

-- RPC: increment signup count (called after a referred user registers)
create or replace function track_influencer_signup(slug text)
returns void
language sql
security definer
as $$
  update influencer_codes set signups = signups + 1 where code = slug;
$$;
