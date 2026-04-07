-- Lobby mode: 'solo' (1+ player can start) or 'party' (2+ required).
-- Run in Supabase SQL Editor if this migration was not applied yet.

alter table public.sessions
  add column if not exists mode text not null default 'party';

-- Optional: enforce allowed values at DB level (comment out if you prefer app-only validation)
-- alter table public.sessions add constraint sessions_mode_check
--   check (mode in ('solo', 'party'));
