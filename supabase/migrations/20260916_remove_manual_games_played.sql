-- Ejecuta esta migración solo si ya aplicaste una versión anterior que creó
-- games_played. La participación se calcula desde los partidos del equipo.

alter table public.players
  drop column if exists games_played;
