create role anon nologin;
create role authenticated nologin;
grant authenticated to current_user;
grant usage on schema public to authenticated;
create schema auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  raw_user_meta_data jsonb not null,
  created_at timestamptz not null default now()
);
create table auth.sessions (
  token_hash text primary key,
  user_id uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null
);
create index sessions_expiry on auth.sessions(expires_at);
create table auth.throttle (
  scope text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
create table auth.demo_setup (
  id boolean primary key check (id)
);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('selectra.actor', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
