create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (char_length(email) between 3 and 320 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  source text not null default 'seo'
    check (char_length(source) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

revoke all on table public.newsletter_subscribers from anon, authenticated;
grant insert on table public.newsletter_subscribers to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'newsletter_subscribers'
      and policyname = 'bounded newsletter capture inserts'
  ) then
    create policy "bounded newsletter capture inserts"
      on public.newsletter_subscribers
      for insert
      to anon, authenticated
      with check (
        char_length(email) between 3 and 320
        and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
        and char_length(source) between 1 and 80
      );
  end if;
end
$$;

comment on table public.newsletter_subscribers is
  'Consent-driven PromoGrind email capture. Public clients may insert bounded rows but cannot read, update, or delete them.';
