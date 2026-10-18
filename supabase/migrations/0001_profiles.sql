-- Phase 2, milestone M1: profiles and roles.
-- Run once in the Supabase SQL Editor (development project first).
--
-- Rules followed here:
--   * The project has "Automatically expose new tables" OFF, so every table
--     gets explicit GRANTs, only to the roles that need them.
--   * Row Level Security is enabled and every access is an explicit policy.
--   * Helper functions live in the "private" schema (not exposed by the API),
--     have a fixed search_path, and are not executable by PUBLIC.
--   * Role is stored in public.profiles and can NOT be changed by the member.
--     No role-changing function exists yet (added in M2 with the audit log).

begin;

-- ---------------------------------------------------------------------------
-- Private schema for helper functions (never exposed through the Data API)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;
grant usage on schema private to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Role type and profiles table
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role' and typnamespace = 'public'::regnamespace) then
    create type public.user_role as enum ('member', 'staff', 'admin');
  end if;
end
$$;

create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text not null check (char_length(full_name) between 1 and 100),
  -- Normalised Nigerian mobile number, for example +2348031234567.
  phone             text not null check (phone ~ '^\+234[789][01][0-9]{8}$'),
  role              public.user_role not null default 'member',
  is_student        boolean not null default false,
  is_active         boolean not null default true,
  terms_accepted_at timestamptz,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Start from nothing, then grant only what is needed.
revoke all on table public.profiles from public;
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;

-- Signed-in users may read profiles (RLS decides which rows) and may update
-- ONLY their own name and phone. They can never touch role, is_active,
-- is_student, terms_accepted_at or deleted_at: those columns are not granted.
grant select on table public.profiles to authenticated;
grant update (full_name, phone) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- ---------------------------------------------------------------------------
-- Helper: the caller's role, read from the database (never from the browser)
-- ---------------------------------------------------------------------------
create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active
    and p.deleted_at is null;
$$;

revoke all on function private.current_user_role() from public;
revoke all on function private.current_user_role() from anon;
grant execute on function private.current_user_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security policies for profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
  on public.profiles
  for select
  to authenticated
  using ((select private.current_user_role()) = 'admin');

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) and is_active and deleted_at is null)
  with check (id = (select auth.uid()));

-- No insert policy and no delete policy: profiles are created by the trigger
-- below and removed only with the login (on delete cascade) in a later milestone.

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.touch_updated_at() from public;
revoke all on function private.touch_updated_at() from anon;
revoke all on function private.touch_updated_at() from authenticated;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Create a profile whenever someone signs up.
-- The role is ALWAYS 'member' here, whatever the browser sent in metadata.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, role, terms_accepted_at)
  values (
    new.id,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'member',
    case when (new.raw_user_meta_data ->> 'terms_accepted') = 'true' then now() end
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
revoke all on function private.handle_new_user() from anon;
revoke all on function private.handle_new_user() from authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

commit;

-- ---------------------------------------------------------------------------
-- First Admin (run separately, ONCE, after that person has registered and
-- verified their email). Type the email in the editor yourself; do not save
-- it in a file:
--
--   update public.profiles
--   set role = 'admin'
--   where id = (select id from auth.users where email = 'PUT-THE-ADMIN-EMAIL-HERE');
-- ---------------------------------------------------------------------------
