-- Estadísticas adicionales de jugador, para completar la ficha de baloncesto:
-- rebotes, robos, tapones, pérdidas y faltas personales.
-- (Puntos = "goals", asistencias = "assists" y triples/libres ya existían.)

alter table public.players
  add column if not exists rebounds integer not null default 0 check (rebounds >= 0),
  add column if not exists steals integer not null default 0 check (steals >= 0),
  add column if not exists blocks integer not null default 0 check (blocks >= 0),
  add column if not exists turnovers integer not null default 0 check (turnovers >= 0),
  add column if not exists personal_fouls integer not null default 0 check (personal_fouls >= 0);