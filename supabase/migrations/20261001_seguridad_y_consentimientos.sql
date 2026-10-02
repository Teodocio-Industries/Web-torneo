-- =====================================================================
-- Seguridad y cumplimiento — 2026-10-01
-- Ejecutar en Supabase → SQL Editor (es idempotente: se puede repetir).
-- =====================================================================

-- 1) CRÍTICO — Escalada de privilegios.
--    La política anterior permitía `auth.uid() = id` en INSERT sin restringir el rol:
--    cualquier usuario autenticado sin perfil podía insertarse como 'admin'.
--    La función `admin-create-user` usa la service key (ignora RLS), así que no se afecta.
drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.is_admin());

-- 2) Privacidad — antes cualquier usuario con sesión podía leer TODOS los perfiles
--    (correos y nombres). La app solo necesita el propio perfil; el admin ve todos.
drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- 3) is_admin() es SECURITY DEFINER: se fija su search_path (aviso del asesor de seguridad).
alter function public.is_admin() set search_path = public;

-- 4) Subidas: solo imágenes y máximo 5 MB, aplicado en el servidor (no solo en el navegador).
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp']
 where id = 'mundial-media';

-- 5) Constancias de autorización (Ley 1581 / Decreto 1377: la autorización debe poder probarse).
--    Solo administradores; no hay políticas de UPDATE/DELETE (registro de solo-agregar).
create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  subject_name text not null,
  subject_email text,
  is_minor boolean not null default false,
  guardian_name text,
  kind text not null check (kind in ('tratamiento_datos','uso_imagen','compra_servicio')),
  policy_version text not null,
  evidence_note text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.consent_records enable row level security;
drop policy if exists consent_records_select_admin on public.consent_records;
drop policy if exists consent_records_insert_admin on public.consent_records;
create policy consent_records_select_admin on public.consent_records for select to authenticated using (public.is_admin());
create policy consent_records_insert_admin on public.consent_records for insert to authenticated with check (public.is_admin());

-- 6) URGENTE (manual) — Cuentas de prueba publicadas.
--    Las cuentas admin@/jugador1@/jugador2@/usuario@mundial2026.com y sus contraseñas estuvieron
--    visibles en la pantalla de login y en el README. Hazlo EN ESTE ORDEN:
--      a) Crea tu administrador real desde el panel (Cuentas) con una contraseña larga y única, e inicia sesión con él.
--      b) Elimina las cuentas demo en Supabase → Authentication → Users (o con el SQL de abajo, quitando los "--").
--    Borrar de auth.users elimina también el perfil si la FK es ON DELETE CASCADE; revisa antes.
-- delete from auth.users
--  where lower(email) in ('admin@mundial2026.com','jugador1@mundial2026.com','jugador2@mundial2026.com','usuario@mundial2026.com');