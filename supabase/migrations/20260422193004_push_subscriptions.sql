-- Copied from scripts/migration-push-subscriptions.sql for live Supabase db push.

create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz default now(),
  last_sent_at timestamptz,
  active boolean default true,
  unique(user_id, endpoint)
);

alter table public.push_subscriptions add column if not exists id uuid default gen_random_uuid();
alter table public.push_subscriptions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.push_subscriptions add column if not exists endpoint text;
alter table public.push_subscriptions add column if not exists p256dh text;
alter table public.push_subscriptions add column if not exists auth_key text;
alter table public.push_subscriptions add column if not exists user_agent text;
alter table public.push_subscriptions add column if not exists created_at timestamptz default now();
alter table public.push_subscriptions add column if not exists last_sent_at timestamptz;
alter table public.push_subscriptions add column if not exists active boolean default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'push_subscriptions_user_id_endpoint_key'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_user_id_endpoint_key unique(user_id, endpoint);
  end if;
end $$;

alter table public.push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'Manage own push subscriptions'
  ) then
    create policy "Manage own push subscriptions" on public.push_subscriptions
      for all using (user_id = auth.uid());
  end if;
end $$;
