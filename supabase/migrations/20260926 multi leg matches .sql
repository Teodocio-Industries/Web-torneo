-- Soporte para cruces a varias vueltas (ida y vuelta, o ida/vuelta/desempate)
-- pensado para Semifinal y Final, sin tocar el resto del bracket.
--
-- legs: cuántos partidos tiene ese cruce (1 = partido único, como hasta ahora;
--       2 = ida y vuelta; 3 = ida, vuelta y tercer partido de desempate).
-- leg_scores: arreglo con el marcador de cada partido jugado, ej.
--       [{"team1":80,"team2":75},{"team1":70,"team2":82}]
--       Los campos existentes team1_score/team2_score siguen funcionando
--       igual que siempre: cuando legs=1 son el marcador del partido único;
--       cuando legs>1, la app los usa como el marcador GLOBAL (agregado) de
--       la serie, calculado a partir de leg_scores.
alter table public.bracket_matches
  add column if not exists legs smallint not null default 1 check (legs in (1,2,3)),
  add column if not exists leg_scores jsonb not null default '[]'::jsonb;

comment on column public.bracket_matches.legs is 'Cantidad de partidos del cruce: 1 (único), 2 (ida y vuelta) o 3 (ida/vuelta/desempate).';
comment on column public.bracket_matches.leg_scores is 'Marcador de cada partido de la serie cuando legs > 1: [{"team1":n,"team2":n}, ...].';

do $$
begin
  alter publication supabase_realtime add table public.bracket_matches;
exception when duplicate_object then null;
end $$;