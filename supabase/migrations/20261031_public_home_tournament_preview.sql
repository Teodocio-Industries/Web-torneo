-- Datos estrictamente deportivos que se muestran en la página de inicio.
-- Permite que visitantes sin cuenta consulten el torneo, equipos, cruces y
-- posiciones. No concede acceso a perfiles, cuentas, jugadores ni escritura.

alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.bracket_matches enable row level security;
alter table public.standings enable row level security;

drop policy if exists public_home_tournaments_read on public.tournaments;
create policy public_home_tournaments_read
  on public.tournaments for select to anon, authenticated
  using (true);

drop policy if exists public_home_teams_read on public.teams;
create policy public_home_teams_read
  on public.teams for select to anon, authenticated
  using (true);

drop policy if exists public_home_bracket_matches_read on public.bracket_matches;
create policy public_home_bracket_matches_read
  on public.bracket_matches for select to anon, authenticated
  using (true);

drop policy if exists public_home_standings_read on public.standings;
create policy public_home_standings_read
  on public.standings for select to anon, authenticated
  using (true);
