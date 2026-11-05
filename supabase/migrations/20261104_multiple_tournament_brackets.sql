-- Permite tener varios cuadros independientes dentro de un mismo torneo.
create table if not exists public.tournament_brackets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  sort_order integer not null default 1,
  team_count integer not null default 0 check (team_count >= 0),
  team_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.bracket_matches
  add column if not exists bracket_id uuid references public.tournament_brackets(id) on delete cascade;

-- Los cuadros existentes pasan a ser el Bracket 1 de cada torneo.
with legacy_brackets as (
  select
    bm.tournament_id,
    count(distinct team_id)::integer as team_count,
    coalesce(array_agg(distinct team_id) filter (where team_id is not null), '{}'::uuid[]) as team_ids
  from public.bracket_matches bm
  cross join lateral (
    values
      (case when bm.team1_id is not null and bm.team1_id <> 'BYE' then bm.team1_id::uuid end),
      (case when bm.team2_id is not null and bm.team2_id <> 'BYE' then bm.team2_id::uuid end)
  ) as teams(team_id)
  group by bm.tournament_id
)
insert into public.tournament_brackets (tournament_id, name, sort_order, team_count, team_ids)
select tournament_id, 'Bracket 1', 1, team_count, team_ids
from legacy_brackets
where not exists (
  select 1 from public.tournament_brackets existing
  where existing.tournament_id = legacy_brackets.tournament_id
);

update public.bracket_matches bm
set bracket_id = tb.id
from public.tournament_brackets tb
where tb.tournament_id = bm.tournament_id
  and tb.sort_order = 1
  and bm.bracket_id is null;

alter table public.bracket_matches
  alter column bracket_id set not null;

alter table public.tournament_brackets enable row level security;

drop policy if exists tournament_brackets_public_read on public.tournament_brackets;
create policy tournament_brackets_public_read
  on public.tournament_brackets for select to anon, authenticated
  using (true);

drop policy if exists tournament_brackets_admin_write on public.tournament_brackets;
create policy tournament_brackets_admin_write
  on public.tournament_brackets for all to authenticated
  using (is_admin()) with check (is_admin());

do $$
begin
  alter publication supabase_realtime add table public.tournament_brackets;
exception when duplicate_object then null;
end $$;
