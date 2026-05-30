-- 0003_auto_confirm_users.sql
-- Username/password accounts use synthetic @gymapp.local emails that can't
-- receive a confirmation mail. Auto-confirm every new signup so login is instant.

create or replace function public.auto_confirm_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists auto_confirm_on_signup on auth.users;
create trigger auto_confirm_on_signup
  before insert on auth.users
  for each row execute function public.auto_confirm_user();

-- Trigger-only function; not callable via the public API.
revoke execute on function public.auto_confirm_user() from public, anon, authenticated;
