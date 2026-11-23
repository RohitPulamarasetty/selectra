create table auth.demo_workspaces (
  id uuid primary key,
  expires_at timestamptz not null,
  revision integer not null check (revision between 0 and 120),
  snapshot jsonb not null
);
create index demo_workspaces_expiry on auth.demo_workspaces(expires_at);
revoke all on auth.demo_workspaces from public, anon, authenticated;
