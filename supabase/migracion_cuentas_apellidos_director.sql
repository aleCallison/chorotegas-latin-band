-- ============================================================
-- CHOROTEGAS LATIN BAND
-- CUENTAS + APELLIDOS + DIRECTOR DE LA BANDA
-- SIN NOTIFICACIONES PUSH
-- ============================================================

-- 1) Apellido en perfiles
alter table public.profiles
add column if not exists apellido text;

-- 2) Nuevo rol interno
alter type public.app_role
add value if not exists 'director_banda';

-- 3) Registro: nombre + apellido + email + sección
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, apellido, email, rol, seccion)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'apellido'), ''),
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
    apellido = coalesce(public.profiles.apellido, excluded.apellido),
    email = excluded.email,
    seccion = coalesce(public.profiles.seccion, excluded.seccion);

  return new;
end;
$$;

-- 4) Mantener email de profiles sincronizado con Auth
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute procedure public.sync_profile_email();

-- 5) Cada usuario puede corregir únicamente su nombre y apellido
create or replace function public.update_my_profile(
  p_nombre text,
  p_apellido text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if nullif(trim(p_nombre), '') is null then
    raise exception 'El nombre es obligatorio.';
  end if;

  if nullif(trim(p_apellido), '') is null then
    raise exception 'El apellido es obligatorio.';
  end if;

  update public.profiles
  set
    nombre = trim(p_nombre),
    apellido = trim(p_apellido)
  where id = auth.uid()
  returning * into updated_profile;

  return updated_profile;
end;
$$;

revoke all on function public.update_my_profile(text, text) from public;
grant execute on function public.update_my_profile(text, text) to authenticated;

-- ============================================================
-- PERMISOS: DIRECTOR DE LA BANDA
-- Puede:
--   - Entrar al panel
--   - Crear, editar y eliminar ensayos
--   - Ver integrantes activos para pasar asistencia
--   - Crear y actualizar registros de asistencia
--
-- No puede:
--   - Cambiar usuarios o roles
--   - Administrar economía/reportes
--   - Administrar instrumentos
--   - Administrar eventos/comunicados
-- ============================================================

-- Perfiles: el staff puede verlos; los integrantes solo el suyo
drop policy if exists "profiles own or staff read" on public.profiles;
create policy "profiles own or staff read"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.current_user_role()::text in ('admin', 'director', 'director_banda')
);

-- Integrantes: Director de la banda solo necesita lectura
drop policy if exists "staff reads all integrantes" on public.integrantes;
create policy "staff reads all integrantes"
on public.integrantes for select
to authenticated
using (
  public.current_user_role()::text in ('admin', 'director', 'director_banda')
);

-- Mantener modificación de integrantes solo para admin/director normal
drop policy if exists "staff inserts integrantes" on public.integrantes;
create policy "staff inserts integrantes"
on public.integrantes for insert
to authenticated
with check (
  public.current_user_role()::text in ('admin', 'director')
);

drop policy if exists "staff updates integrantes" on public.integrantes;
create policy "staff updates integrantes"
on public.integrantes for update
to authenticated
using (
  public.current_user_role()::text in ('admin', 'director')
)
with check (
  public.current_user_role()::text in ('admin', 'director')
);

-- Ensayos: los tres roles de gestión pueden administrarlos
drop policy if exists "staff reads all ensayos" on public.ensayos;
create policy "staff reads all ensayos"
on public.ensayos for select
to authenticated
using (
  public.current_user_role()::text in ('admin', 'director', 'director_banda')
);

drop policy if exists "staff manages ensayos" on public.ensayos;
create policy "staff manages ensayos"
on public.ensayos for all
to authenticated
using (
  public.current_user_role()::text in ('admin', 'director', 'director_banda')
)
with check (
  public.current_user_role()::text in ('admin', 'director', 'director_banda')
);

-- Asistencia: Director de la banda puede pasar y corregir asistencia
drop policy if exists "staff reads attendance" on public.asistencia;
create policy "staff reads attendance"
on public.asistencia for select
to authenticated
using (
  public.current_user_role()::text in ('admin', 'director', 'director_banda')
);

drop policy if exists "staff manages attendance" on public.asistencia;
create policy "staff manages attendance"
on public.asistencia for all
to authenticated
using (
  public.current_user_role()::text in ('admin', 'director', 'director_banda')
)
with check (
  public.current_user_role()::text in ('admin', 'director', 'director_banda')
);
