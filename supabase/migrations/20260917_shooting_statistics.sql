-- Estadísticas de lanzamiento para los perfiles públicos de jugadores.
alter table public.players
  add column if not exists three_points_attempted integer not null default 0 check (three_points_attempted >= 0),
  add column if not exists three_points_made integer not null default 0 check (three_points_made >= 0),
  add column if not exists free_throws_attempted integer not null default 0 check (free_throws_attempted >= 0),
  add column if not exists free_throws_made integer not null default 0 check (free_throws_made >= 0);

