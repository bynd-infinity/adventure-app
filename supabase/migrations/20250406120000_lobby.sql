-- Lobby tables for guest multiplayer (Phase 2).
-- Apply in Supabase SQL Editor or via supabase db push.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby',
  current_scene text not null default '',
  turn_index int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  name text not null,
  character_class text not null default '',
  hp int not null default 100,
  is_host boolean not null default false,
  ready boolean not null default false,
  turn_order int not null default 0
);

create index if not exists players_session_id_idx on public.players (session_id);

alter table public.sessions enable row level security;
alter table public.players enable row level security;

create policy "sessions_anon_all" on public.sessions
  for all
  to anon
  using (true)
  with check (true);

create policy "sessions_authenticated_all" on public.sessions
  for all
  to authenticated
  using (true)
  with check (true);

create policy "players_anon_all" on public.players
  for all
  to anon
  using (true)
  with check (true);

create policy "players_authenticated_all" on public.players
  for all
  to authenticated
  using (true)
  with check (true);

alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.sessions;
