-- Aggregate-only input to the scheduled publisher. Never exposed to browser roles.
-- Closed UTC weeks avoid partial-day comparisons. No betting amounts or identities leave SQL.
create index if not exists workflow_state_stats_created_idx on public.workflow_state(created_at);
create index if not exists workflow_history_stats_created_idx on public.workflow_history(created_at);

create or replace function public.public_stats_source()
returns jsonb language sql security definer set search_path = ''
set statement_timeout = '10s'
as $$
  with weeks as (
    select (date_trunc('week', now() at time zone 'UTC') - n * interval '1 week') at time zone 'UTC' as start_at
    from generate_series(1,4) as n
  ), counts as (
    select w.start_at,
      (select count(*) from public.workflow_state s where s.created_at >= w.start_at and s.created_at < w.start_at + interval '1 week') as workflows,
      (select count(distinct s.user_id) from public.workflow_state s where s.created_at >= w.start_at and s.created_at < w.start_at + interval '1 week') as contributors,
      (select count(distinct (h.user_id, h.workflow_id)) from public.workflow_history h where h.status = 'settled' and h.created_at >= w.start_at and h.created_at < w.start_at + interval '1 week') as outcomes,
      (select count(distinct h.user_id) from public.workflow_history h where h.status = 'settled' and h.created_at >= w.start_at and h.created_at < w.start_at + interval '1 week') as outcome_contributors
    from weeks w
  )
  select jsonb_build_object('computedAt', now(), 'weeks', jsonb_agg(jsonb_build_object(
    'start', start_at, 'end', start_at + interval '1 week',
    'contributors', contributors, 'workflows', workflows, 'outcomes', outcomes,
    'outcomeContributors', outcome_contributors
  ) order by start_at desc)) from counts;
$$;
revoke all on function public.public_stats_source() from public, anon, authenticated;
grant execute on function public.public_stats_source() to service_role;

-- Public reads are immutable JSON objects, never requests against user tables.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('public-stats', 'public-stats', true, 131072, array['application/json'])
on conflict (id) do nothing;
-- Never turn an existing private bucket public or repurpose a differently configured bucket.
do $$ begin
  if not exists (
    select 1 from storage.buckets where id = 'public-stats' and name = 'public-stats'
      and public = true and file_size_limit = 131072 and allowed_mime_types = array['application/json']
  ) then raise exception 'Public stats bucket collision: refusing to change existing access'; end if;
end $$;
-- No object write policies: only the publisher's service role may upload.

-- Schedule activation is separate and explicit; see scripts/activate-public-stats.mjs.
