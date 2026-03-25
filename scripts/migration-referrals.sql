-- PromoGrind — Referral Tracking
-- Run in Supabase SQL Editor after migration-community-board.sql

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referrals (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id      uuid NOT NULL,                                     -- auth.users.id of person who shared the link
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,  -- new user who signed up via the link
  created_at       timestamptz DEFAULT now(),
  rewarded         boolean DEFAULT false,                              -- set true when 30-day credit is applied
  UNIQUE(referred_user_id)                                             -- one referral record per new user
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- New users can record who referred them (INSERT only on their own row)
CREATE POLICY "Insert own referral" ON public.referrals
  FOR INSERT WITH CHECK (referred_user_id = auth.uid());

-- Referrers can read their own referral records
CREATE POLICY "Read referrals I made" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid());

-- ── RPC ───────────────────────────────────────────────────────────────────────

-- Returns the count of users who signed up using the current user's referral link
CREATE OR REPLACE FUNCTION get_my_referral_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.referrals
  WHERE referrer_id = auth.uid();
$$;

-- Returns the count of *rewarded* referrals (subscribed users) for 30-day credit calculation
CREATE OR REPLACE FUNCTION get_my_rewarded_referral_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.referrals
  WHERE referrer_id = auth.uid()
    AND rewarded = true;
$$;
