-- Lobby-run settings: difficulty + optional story hook chosen before start.

alter table public.sessions
  add column if not exists difficulty text not null default 'standard';

alter table public.sessions
  add column if not exists story_hook text;

comment on column public.sessions.difficulty is 'story | standard | hard';
comment on column public.sessions.story_hook is 'hook_debt_collector | hook_missing_heir | hook_broken_oath | null = pick in game';
