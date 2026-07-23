-- Atomic, server-owned AI quota reservations.
-- Finite quotas are claimed before a provider request so concurrent calls
-- cannot exceed the declared free/trial ceiling. Provider failures still
-- consume a claim: cost safety wins, and the usage ledger can explain it.

create table if not exists public.ai_usage_quotas (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  quota_window text not null check (quota_window in ('daily', 'lifetime')),
  window_key text not null,
  used integer not null default 0 check (used >= 0),
  quota_limit integer not null check (quota_limit >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, quota_window, window_key)
);

alter table public.ai_usage_quotas enable row level security;

revoke all on public.ai_usage_quotas from anon, authenticated;

create or replace function public.claim_ai_quota(
  p_user_id uuid,
  p_feature text,
  p_window text,
  p_window_key text,
  p_limit integer
)
returns table (allowed boolean, used integer, quota_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_row public.ai_usage_quotas%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if p_user_id is null or coalesce(trim(p_feature), '') = '' then
    raise exception 'user and feature are required';
  end if;
  if p_window not in ('daily', 'lifetime') or p_limit < 0 then
    raise exception 'invalid quota contract';
  end if;

  insert into public.ai_usage_quotas as q (
    user_id, feature, quota_window, window_key, used, quota_limit, updated_at
  ) values (
    p_user_id, p_feature, p_window, p_window_key, 1, p_limit, now()
  )
  on conflict (user_id, feature, quota_window, window_key) do update
    set used = q.used + 1,
        quota_limit = least(q.quota_limit, excluded.quota_limit),
        updated_at = now()
    where q.used < least(q.quota_limit, excluded.quota_limit)
  returning * into next_row;

  if found and next_row.used <= next_row.quota_limit then
    return query select true, next_row.used, next_row.quota_limit;
    return;
  end if;

  select * into next_row
  from public.ai_usage_quotas q
  where q.user_id = p_user_id
    and q.feature = p_feature
    and q.quota_window = p_window
    and q.window_key = p_window_key;

  return query select false, coalesce(next_row.used, p_limit), p_limit;
end;
$$;

revoke all on function public.claim_ai_quota(uuid, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_ai_quota(uuid, text, text, text, integer) to service_role;
