-- Vinculación opcional de una cuenta con un equipo del torneo.
alter table public.profiles
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists profiles_team_id_idx on public.profiles(team_id);

-- Solo el administrador puede asignar o cambiar el equipo vinculado.
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
