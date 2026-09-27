-- Soporte para BYE en el cuadro de eliminación.
-- BYE es un casillero "fantasma" que se coloca cuando la cantidad de equipos
-- no llega a una potencia de 2: el rival de ese hueco avanza automáticamente
-- a la siguiente ronda sin necesidad de jugar el cruce.
--
-- Para representarlo se permite que team1_id y team2_id almacenen el valor
-- literal 'BYE' (además de UUIDs normales). Como el tipo anterior era uuid,
-- se cambia a text, que acepta tanto UUIDs como la cadena 'BYE'.
--
-- Importante: no se borra ni modifica ninguna fila existente; los UUIDs que
-- ya están guardados siguen funcionando exactamente igual. La FK hacia
-- public.teams se elimina (no se vuelve a crear) porque al pasar a text ya
-- no puede vivir en una FK directa; en su lugar la app se encarga de validar
-- que los valores (cuando no son 'BYE') correspondan a equipos reales.

-- 1) Soltar las FK existentes que apuntan a public.teams (creadas desde el
--    panel de Supabase, no por migración). Son seguras de borrar: la app
--    ya valida la integridad con lookups en JS.
alter table public.bracket_matches
  drop constraint if exists bracket_matches_team1_id_fkey;
alter table public.bracket_matches
  drop constraint if exists bracket_matches_team2_id_fkey;

-- 2) Cambiar el tipo a text para permitir la cadena 'BYE'.
alter table public.bracket_matches
  alter column team1_id type text using team1_id::text,
  alter column team2_id type text using team2_id::text;

-- 3) Bandera para que la app sepa de un vistazo si este bracket tiene BYE.
alter table public.bracket_matches
  add column if not exists has_bye boolean not null default false;

-- 4) CHECK de integridad: cuando el valor no es 'BYE' debe parecerse a un
--    UUID. Esto evita que se cuelen IDs basura sin necesidad de FK.
alter table public.bracket_matches
  drop constraint if exists bracket_matches_team1_id_format_check;
alter table public.bracket_matches
  add constraint bracket_matches_team1_id_format_check
  check (team1_id is null or team1_id = 'BYE' or team1_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

alter table public.bracket_matches
  drop constraint if exists bracket_matches_team2_id_format_check;
alter table public.bracket_matches
  add constraint bracket_matches_team2_id_format_check
  check (team2_id is null or team2_id = 'BYE' or team2_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

comment on column public.bracket_matches.team1_id is 'UUID del equipo 1 del cruce, o la cadena literal BYE cuando es un hueco (sin rival real) y el rival avanza automáticamente.';
comment on column public.bracket_matches.team2_id is 'UUID del equipo 2 del cruce, o la cadena literal BYE cuando es un hueco (sin rival real) y el rival avanza automáticamente.';
comment on column public.bracket_matches.has_bye is 'True si el cuadro tiene al menos un casillero BYE (porque los equipos no llegaban a una potencia de 2).';