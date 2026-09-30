import { createStatsPublisher } from '../_shared/stats-publisher.ts';
Deno.serve(createStatsPublisher({
  key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  url: Deno.env.get('SUPABASE_URL') || '',
}));
