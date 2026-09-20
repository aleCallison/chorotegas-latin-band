-- ============================================================
-- CHOROTEGAS LATIN BAND
-- ACTUALIZACIÓN: MENSUALIDADES + ECONOMÍA
-- Ejecuta este archivo UNA SOLA VEZ en Supabase > SQL Editor.
-- ============================================================

create table if not exists public.mensualidades (
  id uuid primary key default gen_random_uuid(),
  integrante_id uuid not null references public.integrantes(id) on delete cascade,
  anio integer not null check (anio between 2000 and 2100),
  mes integer not null check (mes between 1 and 12),
  monto numeric(12,2) not null check (monto >= 0),
  fecha_pago date not null default current_date,
  metodo_pago text,
  observacion text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (integrante_id, anio, mes)
);

create table if not exists public.movimientos_financieros (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso','egreso')),
  categoria text,
  concepto text not null,
  monto numeric(12,2) not null check (monto > 0),
  fecha date not null default current_date,
  observacion text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_mensualidades_integrante on public.mensualidades(integrante_id);
create index if not exists idx_mensualidades_anio_mes on public.mensualidades(anio, mes);
create index if not exists idx_mensualidades_fecha on public.mensualidades(fecha_pago);
create index if not exists idx_movimientos_fecha on public.movimientos_financieros(fecha);
create index if not exists idx_movimientos_tipo on public.movimientos_financieros(tipo);

alter table public.mensualidades enable row level security;
alter table public.movimientos_financieros enable row level security;

drop policy if exists "admin reads mensualidades" on public.mensualidades;
drop policy if exists "admin manages mensualidades" on public.mensualidades;
drop policy if exists "admin reads movimientos financieros" on public.movimientos_financieros;
drop policy if exists "admin manages movimientos financieros" on public.movimientos_financieros;

create policy "admin reads mensualidades"
on public.mensualidades for select
to authenticated
using (public.current_user_role() = 'admin');

create policy "admin manages mensualidades"
on public.mensualidades for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "admin reads movimientos financieros"
on public.movimientos_financieros for select
to authenticated
using (public.current_user_role() = 'admin');

create policy "admin manages movimientos financieros"
on public.movimientos_financieros for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
