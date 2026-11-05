-- Los índices de partido se repiten entre brackets del mismo torneo.
-- La restricción anterior solo consideraba torneo/ronda/lado/índice.
do $$
declare
  constraint_row record;
  tournament_att smallint;
  bracket_att smallint;
  round_att smallint;
begin
  select attnum into tournament_att
  from pg_attribute
  where attrelid = 'public.bracket_matches'::regclass and attname = 'tournament_id' and not attisdropped;

  select attnum into bracket_att
  from pg_attribute
  where attrelid = 'public.bracket_matches'::regclass and attname = 'bracket_id' and not attisdropped;

  select attnum into round_att
  from pg_attribute
  where attrelid = 'public.bracket_matches'::regclass and attname = 'round_number' and not attisdropped;

  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.bracket_matches'::regclass
      and contype = 'u'
      and tournament_att = any(conkey)
      and round_att = any(conkey)
      and not (bracket_att = any(conkey))
  loop
    execute format('alter table public.bracket_matches drop constraint %I', constraint_row.conname);
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.bracket_matches'::regclass
      and conname = 'bracket_matches_bracket_round_side_index_key'
  ) then
    alter table public.bracket_matches
      add constraint bracket_matches_bracket_round_side_index_key
      unique (tournament_id, bracket_id, round_number, side, match_index);
  end if;
end $$;
