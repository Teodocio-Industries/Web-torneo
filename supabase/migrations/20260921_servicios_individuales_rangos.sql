-- Catálogo de servicios individuales (rangos) que se pueden asignar a jugadores/usuarios.
create table if not exists public.service_tiers (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  tagline text,
  icon text,
  features text[] not null default '{}',
  price_note text,
  base_price numeric(12,2),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.service_tiers is 'Rangos/paquetes de servicio individual (Content Package, Player Spotlight, Player Performance, etc).';

-- Datos de pago (Nequi / Bancolombia / WhatsApp de contacto). Fila única editable por el admin.
create table if not exists public.payment_settings (
  id int primary key default 1,
  nequi_number text default '',
  nequi_holder text default '',
  bancolombia_number text default '',
  bancolombia_holder text default '',
  whatsapp_number text default '',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint payment_settings_singleton check (id = 1)
);

comment on table public.payment_settings is 'Fila única con los números de pago (Nequi/Bancolombia) y el WhatsApp de contacto para comprobantes. Editable solo por admin.';

insert into public.payment_settings (id) values (1) on conflict (id) do nothing;

-- Asignación de un rango a una cuenta (jugador o usuario). El precio se define caso a caso
-- porque el Content Package varía según cantidad/calidad del material.
create table if not exists public.tier_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tier_id uuid not null references public.service_tiers(id) on delete restrict,
  price numeric(12,2) not null default 0,
  note text,
  status text not null default 'pendiente' check (status in ('pendiente','pagado','cancelado')),
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, tier_id)
);

comment on table public.tier_assignments is 'Rango asignado por el admin a una cuenta, con el precio acordado para esa asignación.';

create index if not exists idx_tier_assignments_profile on public.tier_assignments(profile_id);

-- Trigger simple para mantener updated_at al día.
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_service_tiers_updated_at on public.service_tiers;
create trigger trg_service_tiers_updated_at before update on public.service_tiers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_payment_settings_updated_at on public.payment_settings;
create trigger trg_payment_settings_updated_at before update on public.payment_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tier_assignments_updated_at on public.tier_assignments;
create trigger trg_tier_assignments_updated_at before update on public.tier_assignments
  for each row execute function public.set_updated_at();

-- Seguridad (RLS) — mismo patrón que el resto del proyecto (is_admin()).
alter table public.service_tiers enable row level security;
alter table public.payment_settings enable row level security;
alter table public.tier_assignments enable row level security;

drop policy if exists service_tiers_select_all on public.service_tiers;
create policy service_tiers_select_all on public.service_tiers for select using (auth.uid() is not null);
drop policy if exists service_tiers_write_admin on public.service_tiers;
create policy service_tiers_write_admin on public.service_tiers for insert with check (is_admin());
drop policy if exists service_tiers_update_admin on public.service_tiers;
create policy service_tiers_update_admin on public.service_tiers for update using (is_admin());
drop policy if exists service_tiers_delete_admin on public.service_tiers;
create policy service_tiers_delete_admin on public.service_tiers for delete using (is_admin());

drop policy if exists payment_settings_select_all on public.payment_settings;
create policy payment_settings_select_all on public.payment_settings for select using (auth.uid() is not null);
drop policy if exists payment_settings_update_admin on public.payment_settings;
create policy payment_settings_update_admin on public.payment_settings for update using (is_admin());
drop policy if exists payment_settings_insert_admin on public.payment_settings;
create policy payment_settings_insert_admin on public.payment_settings for insert with check (is_admin());

drop policy if exists tier_assignments_select_own_or_admin on public.tier_assignments;
create policy tier_assignments_select_own_or_admin on public.tier_assignments for select using (is_admin() or profile_id = auth.uid());
drop policy if exists tier_assignments_write_admin on public.tier_assignments;
create policy tier_assignments_write_admin on public.tier_assignments for insert with check (is_admin());
drop policy if exists tier_assignments_update_admin on public.tier_assignments;
create policy tier_assignments_update_admin on public.tier_assignments for update using (is_admin());
drop policy if exists tier_assignments_delete_admin on public.tier_assignments;
create policy tier_assignments_delete_admin on public.tier_assignments for delete using (is_admin());

-- Semilla con los 3 rangos del catálogo.
insert into public.service_tiers (key, name, tagline, icon, features, price_note, sort_order)
values
  (
    'content_package',
    'Content Package',
    'Ideal para jugadores que desean material audiovisual de su participación.',
    'camera',
    array[
      'Fotografía de alta calidad exclusiva del jugador.',
      'Videos breves y destacados de sus jugadas clave.',
      '''Highlights'' editados para redes sociales.',
      'Selección experta del material registrado durante los partidos.'
    ],
    'El precio variará según la cantidad y calidad del material.',
    1
  ),
  (
    'player_spotlight',
    'Player Spotlight',
    'Actuación destacada de la jornada. Enfocado en dar máxima visibilidad a los jugadores en redes sociales de Caribe Sports.',
    'star',
    array[
      'Selección y edición experta de las mejores fotos.',
      'Diseño de publicación personalizada y atractiva.',
      'Publicación destacada en nuestras plataformas.',
      'Información básica y estadísticas clave de la actuación.',
      'Etiquetado directo del jugador y su club para mayor alcance.'
    ],
    null,
    2
  ),
  (
    'player_performance',
    'Player Performance',
    'Servicio de análisis individual profundo para un conocimiento total del rendimiento.',
    'chart',
    array[
      'Recopilación exhaustiva de estadísticas del torneo.',
      'Promedios avanzados por partido.',
      'Evolución detallada del rendimiento a lo largo del torneo.',
      'Comparativa entre partidos para medir el progreso.',
      'Gráficos y diagramas estadísticos visuales.',
      'Análisis de rendimiento detallado.',
      'Informe visual personalizado y completo.',
      'Publicación de videos en nuestras plataformas.',
      'Diseño gráfico personalizado con datos e imagen del jugador.'
    ],
    null,
    3
  )
on conflict (key) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.service_tiers;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.payment_settings;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.tier_assignments;
exception when duplicate_object then null;
end $$;
