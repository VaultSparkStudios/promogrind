-- Leaderboard View — run in Supabase SQL Editor
-- Creates a vault_leaderboard view that aggregates vault_events by user

CREATE OR REPLACE VIEW vault_leaderboard AS
SELECT
  user_id,
  SUM(points) AS total_points,
  COUNT(*) AS total_events,
  MAX(created_at) AS last_active
FROM vault_events
GROUP BY user_id
ORDER BY total_points DESC;

-- Grant read access to authenticated users
GRANT SELECT ON vault_leaderboard TO authenticated;
