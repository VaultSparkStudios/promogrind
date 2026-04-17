-- Feature Flags table for server-controlled rollout, kill switches, and beta cohorts.
-- Apply in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS feature_flags (
  key          VARCHAR(100) PRIMARY KEY,
  enabled      BOOLEAN NOT NULL DEFAULT false,
  min_tier     VARCHAR(30) DEFAULT NULL,  -- null = all tiers; 'runner', 'closer', 'house' etc.
  cohort       TEXT[] DEFAULT '{}',       -- specific user IDs (empty = all matching tier)
  note         TEXT DEFAULT '',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial flag definitions (disabled by default — matches build defaults)
INSERT INTO feature_flags (key, enabled, min_tier, note) VALUES
  ('aiScan',        false, NULL, 'AI bet-slip scan via parse-bet-slip edge function'),
  ('promoAdvisor',  false, 'free', 'Promo Advisor panel — enabled for all tiers'),
  ('promoChat',     false, 'scout', 'PromoChat — Scout+ only'),
  ('liveScanner',   false, 'closer', 'Live arbitrage scanner — Closer+ only'),
  ('stackBuilder',  false, 'closer', 'Stack Builder — Closer+ only'),
  ('aiActionPlan',  false, 'runner', 'AI Weekly Action Plan — Runner+ only'),
  ('pushAlerts',    false, NULL, 'Browser push notification subscription flow'),
  ('paidCheckout',  false, NULL, 'Stripe checkout for paid plans')
ON CONFLICT (key) DO NOTHING;

-- Row Level Security: service role only for writes, no public reads (fetched via edge fn)
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON feature_flags FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Allow authenticated reads — client fetches flags on load
CREATE POLICY "authenticated_read" ON feature_flags FOR SELECT TO authenticated USING (true);

-- Function to evaluate a flag for a given user + tier
CREATE OR REPLACE FUNCTION get_feature_flag(p_key TEXT, p_user_id UUID, p_tier TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  flag feature_flags%ROWTYPE;
BEGIN
  SELECT * INTO flag FROM feature_flags WHERE key = p_key;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF NOT flag.enabled THEN RETURN FALSE; END IF;
  -- Cohort gate
  IF array_length(flag.cohort, 1) > 0 AND NOT (p_user_id::TEXT = ANY(flag.cohort)) THEN RETURN FALSE; END IF;
  -- Tier gate
  IF flag.min_tier IS NOT NULL THEN
    RETURN CASE flag.min_tier
      WHEN 'house'   THEN p_tier IN ('house')
      WHEN 'closer'  THEN p_tier IN ('house','closer')
      WHEN 'runner'  THEN p_tier IN ('house','closer','runner')
      WHEN 'scout'   THEN p_tier IN ('house','closer','runner','scout')
      WHEN 'free'    THEN TRUE
      ELSE FALSE
    END;
  END IF;
  RETURN TRUE;
END;
$$;
