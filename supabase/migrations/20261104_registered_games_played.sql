-- Partidos jugados cargados directamente por el administrador.
-- Se suman al cálculo: partidos finalizados por el equipo - suspensiones.
alter table public.players
  add column if not exists games_played integer not null default 0
  check (games_played >= 0);
