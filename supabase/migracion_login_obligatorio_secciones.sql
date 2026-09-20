-- ============================================================
-- CHOROTEGAS LATIN BAND
-- LOGIN OBLIGATORIO + SECCIÓN AL REGISTRARSE
-- Ejecuta este archivo UNA SOLA VEZ en Supabase > SQL Editor.
-- ============================================================

-- 1) Guardar la sección elegida por cada usuario.
alter table public.profiles
add column if not exists seccion text;

alter table public.profiles
drop constraint if exists profiles_seccion_check;

alter table public.profiles
add constraint profiles_seccion_check
check (
  seccion is null
  or seccion in ('Sección de Viento', 'Percusión', 'Cuadros Artísticos', 'Otro')
);

-- 2) Actualizar el trigger que crea el perfil al registrarse.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, email, rol, seccion)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.email,
    'integrante',
    case
      when new.raw_user_meta_data ->> 'seccion' in (
        'Sección de Viento',
        'Percusión',
        'Cuadros Artísticos',
        'Otro'
      )
      then new.raw_user_meta_data ->> 'seccion'
      else null
    end
  )
  on conflict (id) do update
  set
    nombre = excluded.nombre,
    email = excluded.email,
    seccion = coalesce(public.profiles.seccion, excluded.seccion);

  return new;
end;
$$;

-- 3) Convertir el contenido de la banda en privado:
--    solo usuarios autenticados pueden consultar.
drop policy if exists "public reads instrumentos" on public.instrumentos;
create policy "authenticated reads instrumentos"
on public.instrumentos for select
to authenticated
using (true);

drop policy if exists "public reads active integrantes" on public.integrantes;
create policy "authenticated reads active integrantes"
on public.integrantes for select
to authenticated
using (activo = true);

drop policy if exists "public reads published ensayos" on public.ensayos;
create policy "authenticated reads published ensayos"
on public.ensayos for select
to authenticated
using (publicado = true);

drop policy if exists "public reads published eventos" on public.eventos;
create policy "authenticated reads published eventos"
on public.eventos for select
to authenticated
using (publicado = true);

drop policy if exists "public reads published comunicados" on public.comunicados;
create policy "authenticated reads published comunicados"
on public.comunicados for select
to authenticated
using (publicado = true);

-- 4) El reporte de mensualidades deja de estar disponible para visitantes anónimos.
do $$
begin
  if to_regprocedure('public.estado_mensualidades_publico(integer)') is not null then
    revoke execute on function public.estado_mensualidades_publico(integer) from anon;
    grant execute on function public.estado_mensualidades_publico(integer) to authenticated;
  end if;

  if to_regprocedure('public.resumen_anual_publico(integer)') is not null then
    revoke execute on function public.resumen_anual_publico(integer) from anon;
  end if;

  if to_regprocedure('public.resumen_economia_publica(integer)') is not null then
    revoke execute on function public.resumen_economia_publica(integer) from anon;
  end if;
end $$;

-- 5) Mantener lectura del propio perfil y lectura de staff.
--    (La política ya existía en el esquema original; se recrea de forma segura.)
drop policy if exists "profiles own or staff read" on public.profiles;
create policy "profiles own or staff read"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.current_user_role() in ('admin','director')
);
