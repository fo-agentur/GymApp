-- 0002_harden_functions.sql — security hardening flagged by Supabase advisors

-- Lock down search_path on all functions (advisor 0011_function_search_path_mutable)
alter function public.estimate_1rm(numeric, int) set search_path = '';
alter function public.get_last_performance(uuid, uuid) set search_path = public, pg_catalog;
alter function public.handle_new_user() set search_path = '';

-- handle_new_user is a trigger-only function; it must not be callable via the
-- public API (advisors 0028/0029). The trigger still fires as table owner.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
