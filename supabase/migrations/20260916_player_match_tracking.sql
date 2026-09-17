-- Seguimiento de participación del jugador.
-- games_suspended se guarda aparte y se resta de los partidos finalizados
-- por el equipo. Los promedios deportivos nunca cuentan partidos suspendidos.

alter table public.players
  add column if not exists games_suspended integer not null default 0 check (games_suspended >= 0);

alter table public.players enable row level security;

-- Para que los cambios de estadísticas lleguen sin recargar a las fichas abiertas.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;
end;
$$;
