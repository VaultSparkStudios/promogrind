-- Copied from scripts/migration-feature-flags.sql for live Supabase db push.

create table if not exists feature_flags (
  key varchar(100) primary key,
  enabled boolean not null default false,
  min_tier varchar(30) default null,
  cohort text[] default '{}',
  note text default '',
  updated_at timestamptz default now()
);

insert into feature_flags (key, enabled, min_tier, note) values
  ('aiScan', false, null, 'AI bet-slip scan via parse-bet-slip edge function'),
  ('promoAdvisor', false, 'free', 'Promo Advisor panel — enabled for all tiers'),
  ('promoChat', false, 'scout', 'PromoChat — Scout+ only'),
  ('liveScanner', false, 'closer', 'Live arbitrage scanner — Closer+ only'),
  ('stackBuilder', false, 'closer', 'Stack Builder — Closer+ only'),
  ('aiActionPlan', false, 'runner', 'AI Weekly Action Plan — Runner+ only'),
  ('pushAlerts', false, null, 'Browser push notification subscription flow'),
  ('paidCheckout', false, null, 'Stripe checkout for paid plans')
on conflict (key) do nothing;

alter table feature_flags enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feature_flags' and policyname = 'service_role_all'
  ) then
    create policy "service_role_all" on feature_flags for all to service_role using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feature_flags' and policyname = 'authenticated_read'
  ) then
    create policy "authenticated_read" on feature_flags for select to authenticated using (true);
  end if;
end $$;

create or replace function get_feature_flag(p_key text, p_user_id uuid, p_tier text)
returns boolean language plpgsql security definer as $$
declare
  flag feature_flags%rowtype;
begin
  select * into flag from feature_flags where key = p_key;
  if not found then return false; end if;
  if not flag.enabled then return false; end if;
  if array_length(flag.cohort, 1) > 0 and not (p_user_id::text = any(flag.cohort)) then return false; end if;
  if flag.min_tier is not null then
    return case flag.min_tier
      when 'house' then p_tier in ('house')
      when 'closer' then p_tier in ('house','closer')
      when 'runner' then p_tier in ('house','closer','runner')
      when 'scout' then p_tier in ('house','closer','runner','scout')
      when 'free' then true
      else false
    end;
  end if;
  return true;
end;
$$;
