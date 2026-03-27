-- Gift tokens table for "Gift 14 Days Free" referral feature
-- Run in Supabase SQL Editor before deploying gift-trial edge function

CREATE TABLE IF NOT EXISTS gift_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_email TEXT,
  recipient_email TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 14,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_tokens_token_idx ON gift_tokens(token);
CREATE INDEX IF NOT EXISTS gift_tokens_sender_idx ON gift_tokens(sender_id);

ALTER TABLE gift_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can view their own gift tokens"
  ON gift_tokens FOR SELECT
  USING (sender_id = auth.uid());

-- RPC: redeem a gift token (called when recipient visits ?gift= URL)
CREATE OR REPLACE FUNCTION redeem_gift_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_gift gift_tokens;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_gift
  FROM gift_tokens
  WHERE token = p_token AND redeemed = false AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired gift token');
  END IF;

  UPDATE gift_tokens
  SET redeemed = true, redeemed_at = now(), redeemed_by = v_user_id
  WHERE token = p_token;

  RETURN jsonb_build_object('ok', true, 'days', v_gift.days, 'sender_email', v_gift.sender_email);
END;
$$;

-- Simple newsletter_subscribers table (used by pg-capture.js email interstitial)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'seo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (email capture from landing pages)
CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);
