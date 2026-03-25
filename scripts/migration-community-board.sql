-- Community Promo Board — run in Supabase SQL Editor
-- Creates the promo_submissions table and RLS policies

CREATE TABLE IF NOT EXISTS promo_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  promo_type TEXT NOT NULL CHECK (promo_type IN ('Profit Boost','Bonus Bet','Deposit Match','Safety Net','Odds Boost','Parlay Insurance','Other')),
  description TEXT NOT NULL,
  value TEXT,
  expires_at DATE,
  upvotes INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE promo_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "promo_submissions_read" ON promo_submissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can insert their own
CREATE POLICY "promo_submissions_insert" ON promo_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own submissions
CREATE POLICY "promo_submissions_update" ON promo_submissions
  FOR UPDATE USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS promo_submissions_created_idx ON promo_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS promo_submissions_book_idx ON promo_submissions (book);
