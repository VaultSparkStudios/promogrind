-- Repair production Auth signup failures caused by stale custom auth.users triggers.
-- PromoGrind does not depend on a profile bootstrap trigger; account state is read
-- from Supabase Auth plus app-owned tracker/ledger tables.

do $$
declare
  trigger_name text;
begin
  foreach trigger_name in array array[
    'on_auth_user_created',
    'handle_new_user',
    'create_profile_for_user',
    'create_public_profile_for_user',
    'after_user_created',
    'after_auth_user_created'
  ]
  loop
    execute format('drop trigger if exists %I on auth.users', trigger_name);
  end loop;
end $$;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.create_profile_for_user() cascade;
drop function if exists public.create_public_profile_for_user() cascade;
