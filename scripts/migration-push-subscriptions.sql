-- PromoGrind — Push Subscription Storage
-- For the future VAPID web-push daily briefing feature.
-- Stores browser push subscription objects so the server can send
-- scheduled notifications when the user's browser is closed.
--
-- Run in Supabase SQL Editor when implementing server-sent push notifications.
-- NOT required for v9.0 (current in-browser Notification API approach).

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint        text NOT NULL,
  p256dh          text NOT NULL,  -- public key
  auth_key        text NOT NULL,  -- auth secret
  user_agent      text,           -- for debugging / browser targeting
  created_at      timestamptz DEFAULT now(),
  last_sent_at    timestamptz,
  active          boolean DEFAULT true,
  UNIQUE(user_id, endpoint)       -- one subscription per browser per user
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions only
CREATE POLICY "Manage own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- When implementing:
-- 1. Generate VAPID keys: npx web-push generate-vapid-keys
-- 2. Store VAPID_PUBLIC_KEY in .env and index.html meta tag
-- 3. Store VAPID_PRIVATE_KEY as Supabase secret: supabase secrets set VAPID_PRIVATE_KEY=...
-- 4. Create Edge Function: supabase/functions/send-daily-brief/index.ts
--    - Runs on schedule (Supabase cron at 9am UTC)
--    - Reads active push_subscriptions
--    - Sends notification via web-push library
-- 5. In sw.js, add push event handler to display the notification
