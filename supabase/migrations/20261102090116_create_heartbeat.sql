-- Heartbeat: a single-row table that a scheduled job reads every few days
-- so the free-tier project counts as active and isn't paused.
-- Read-only for the public (anon) key; nobody can write through the API.

create table public.heartbeat (
  id smallint primary key default 1 check (id = 1), -- enforces one row
  note text not null default 'Tora keep-alive',
  created_at timestamptz not null default now()
);

comment on table public.heartbeat is 'Single row read by the keep-alive job. Read-only via the API.';

insert into public.heartbeat (id) values (1);

alter table public.heartbeat enable row level security;

-- Least privilege: only SELECT for anon, nothing for signed-in users through the API.
revoke all on public.heartbeat from anon, authenticated;
grant select on public.heartbeat to anon;

create policy "Anyone with the publishable key can read the heartbeat"
  on public.heartbeat
  for select
  to anon
  using (true);
