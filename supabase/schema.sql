-- ============================================================
-- CHOROTEGAS LATIN BAND - ESQUEMA INICIAL PARA SUPABASE
-- Ejecuta este archivo completo en Supabase > SQL Editor.
-- ============================================================

create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('admin','director','integrante');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.attendance_status as enum ('presente','ausente','tarde','justificado');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  email text,
  rol public.app_role not null default 'integrante',
  created_at timestamptz not null default now()
);

create table if not exists public.instrumentos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  seccion text,
  created_at timestamptz not null default now()
);

create table if not exists public.integrantes (
  id uuid primary key default gen_random_uuid(),
  nombres text not null,
  apellidos text not null,
  alias text,
  foto_url text,
  instrumento_id uuid references public.instrumentos(id) on delete set null,
  seccion text,
  fecha_ingreso date,
  usuario_id uuid unique references public.profiles(id) on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ensayos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  fecha date not null,
  hora_inicio time,
  hora_fin time,
  lugar text,
  descripcion text,
  publicado boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fecha date not null,
  hora time,
  lugar text,
  descripcion text,
  publicado boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.comunicados (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  contenido text not null,
  fecha_publicacion date not null default current_date,
  publicado boolean not null default true,
  autor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.asistencia (
  id uuid primary key default gen_random_uuid(),
  ensayo_id uuid not null references public.ensayos(id) on delete cascade,
  integrante_id uuid not null references public.integrantes(id) on delete cascade,
  estado public.attendance_status not null default 'presente',
  observacion text,
  created_at timestamptz not null default now(),
  unique (ensayo_id, integrante_id)
);

-- Perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.email,
    'integrante'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Función de rol actual
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid();
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.instrumentos enable row level security;
alter table public.integrantes enable row level security;
alter table public.ensayos enable row level security;
alter table public.eventos enable row level security;
alter table public.comunicados enable row level security;
alter table public.asistencia enable row level security;

-- Limpieza de políticas por si se vuelve a ejecutar
drop policy if exists "profiles own or staff read" on public.profiles;
drop policy if exists "admin updates profiles" on public.profiles;
drop policy if exists "public reads instrumentos" on public.instrumentos;
drop policy if exists "admin manages instrumentos" on public.instrumentos;
drop policy if exists "public reads active integrantes" on public.integrantes;
drop policy if exists "staff reads all integrantes" on public.integrantes;
drop policy if exists "staff inserts integrantes" on public.integrantes;
drop policy if exists "staff updates integrantes" on public.integrantes;
drop policy if exists "admin deletes integrantes" on public.integrantes;
drop policy if exists "public reads published ensayos" on public.ensayos;
drop policy if exists "staff reads all ensayos" on public.ensayos;
drop policy if exists "staff manages ensayos" on public.ensayos;
drop policy if exists "public reads published eventos" on public.eventos;
drop policy if exists "staff reads all eventos" on public.eventos;
drop policy if exists "staff manages eventos" on public.eventos;
drop policy if exists "public reads published comunicados" on public.comunicados;
drop policy if exists "staff reads all comunicados" on public.comunicados;
drop policy if exists "staff manages comunicados" on public.comunicados;
drop policy if exists "members read own attendance" on public.asistencia;
drop policy if exists "staff reads attendance" on public.asistencia;
drop policy if exists "staff manages attendance" on public.asistencia;

create policy "profiles own or staff read"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.current_user_role() in ('admin','director')
);

create policy "admin updates profiles"
on public.profiles for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "public reads instrumentos"
on public.instrumentos for select
to anon, authenticated
using (true);

create policy "admin manages instrumentos"
on public.instrumentos for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "public reads active integrantes"
on public.integrantes for select
to anon, authenticated
using (activo = true);

create policy "staff reads all integrantes"
on public.integrantes for select
to authenticated
using (public.current_user_role() in ('admin','director'));

create policy "staff inserts integrantes"
on public.integrantes for insert
to authenticated
with check (public.current_user_role() in ('admin','director'));

create policy "staff updates integrantes"
on public.integrantes for update
to authenticated
using (public.current_user_role() in ('admin','director'))
with check (public.current_user_role() in ('admin','director'));

create policy "admin deletes integrantes"
on public.integrantes for delete
to authenticated
using (public.current_user_role() = 'admin');

create policy "public reads published ensayos"
on public.ensayos for select
to anon, authenticated
using (publicado = true);

create policy "staff reads all ensayos"
on public.ensayos for select
to authenticated
using (public.current_user_role() in ('admin','director'));

create policy "staff manages ensayos"
on public.ensayos for all
to authenticated
using (public.current_user_role() in ('admin','director'))
with check (public.current_user_role() in ('admin','director'));

create policy "public reads published eventos"
on public.eventos for select
to anon, authenticated
using (publicado = true);

create policy "staff reads all eventos"
on public.eventos for select
to authenticated
using (public.current_user_role() in ('admin','director'));

create policy "staff manages eventos"
on public.eventos for all
to authenticated
using (public.current_user_role() in ('admin','director'))
with check (public.current_user_role() in ('admin','director'));

create policy "public reads published comunicados"
on public.comunicados for select
to anon, authenticated
using (publicado = true);

create policy "staff reads all comunicados"
on public.comunicados for select
to authenticated
using (public.current_user_role() in ('admin','director'));

create policy "staff manages comunicados"
on public.comunicados for all
to authenticated
using (public.current_user_role() in ('admin','director'))
with check (public.current_user_role() in ('admin','director'));

create policy "members read own attendance"
on public.asistencia for select
to authenticated
using (
  integrante_id in (
    select id from public.integrantes where usuario_id = auth.uid()
  )
);

create policy "staff reads attendance"
on public.asistencia for select
to authenticated
using (public.current_user_role() in ('admin','director'));

create policy "staff manages attendance"
on public.asistencia for all
to authenticated
using (public.current_user_role() in ('admin','director'))
with check (public.current_user_role() in ('admin','director'));

-- Índices útiles
create index if not exists idx_integrantes_instrumento on public.integrantes(instrumento_id);
create index if not exists idx_integrantes_usuario on public.integrantes(usuario_id);
create index if not exists idx_ensayos_fecha on public.ensayos(fecha);
create index if not exists idx_eventos_fecha on public.eventos(fecha);
create index if not exists idx_comunicados_fecha on public.comunicados(fecha_publicacion);
create index if not exists idx_asistencia_ensayo on public.asistencia(ensayo_id);
create index if not exists idx_asistencia_integrante on public.asistencia(integrante_id);
