-- ============================================================
-- CHOROTEGAS LATIN BAND
-- REPORTES + ECONOMÍA + TRANSPARENCIA PÚBLICA
-- Ejecuta este archivo UNA SOLA VEZ en Supabase > SQL Editor.
-- Es seguro ejecutarlo aunque ya hayas aplicado la actualización
-- anterior de reportes/economía.
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

-- ------------------------------------------------------------
-- Funciones públicas SEGURAS
-- No abren las tablas financieras completas.
-- Solo devuelven la información necesaria para transparencia.
-- ------------------------------------------------------------

create or replace function public.resumen_anual_publico(p_anio integer)
returns table (
  cuotas numeric,
  otros_ingresos numeric,
  ingresos_totales numeric,
  egresos numeric,
  balance numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with cuotas_cte as (
    select coalesce(sum(monto), 0)::numeric as total
    from public.mensualidades
    where extract(year from fecha_pago)::integer = p_anio
  ),
  ingresos_cte as (
    select coalesce(sum(monto), 0)::numeric as total
    from public.movimientos_financieros
    where tipo = 'ingreso'
      and extract(year from fecha)::integer = p_anio
  ),
  egresos_cte as (
    select coalesce(sum(monto), 0)::numeric as total
    from public.movimientos_financieros
    where tipo = 'egreso'
      and extract(year from fecha)::integer = p_anio
  )
  select
    c.total as cuotas,
    i.total as otros_ingresos,
    (c.total + i.total)::numeric as ingresos_totales,
    e.total as egresos,
    (c.total + i.total - e.total)::numeric as balance
  from cuotas_cte c, ingresos_cte i, egresos_cte e;
$$;

create or replace function public.resumen_economia_publica(p_anio integer)
returns table (
  mes integer,
  mensualidades numeric,
  otros_ingresos numeric,
  egresos numeric,
  balance numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with meses as (
    select generate_series(1, 12)::integer as mes
  ),
  cuotas as (
    select
      extract(month from fecha_pago)::integer as mes,
      sum(monto)::numeric as total
    from public.mensualidades
    where extract(year from fecha_pago)::integer = p_anio
    group by 1
  ),
  ingresos as (
    select
      extract(month from fecha)::integer as mes,
      sum(monto)::numeric as total
    from public.movimientos_financieros
    where tipo = 'ingreso'
      and extract(year from fecha)::integer = p_anio
    group by 1
  ),
  egresos_cte as (
    select
      extract(month from fecha)::integer as mes,
      sum(monto)::numeric as total
    from public.movimientos_financieros
    where tipo = 'egreso'
      and extract(year from fecha)::integer = p_anio
    group by 1
  )
  select
    m.mes,
    coalesce(c.total, 0)::numeric as mensualidades,
    coalesce(i.total, 0)::numeric as otros_ingresos,
    coalesce(e.total, 0)::numeric as egresos,
    (coalesce(c.total, 0) + coalesce(i.total, 0) - coalesce(e.total, 0))::numeric as balance
  from meses m
  left join cuotas c on c.mes = m.mes
  left join ingresos i on i.mes = m.mes
  left join egresos_cte e on e.mes = m.mes
  order by m.mes;
$$;

create or replace function public.estado_mensualidades_publico(p_anio integer)
returns table (
  integrante_id uuid,
  nombre text,
  seccion text,
  mes integer,
  pagado boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id as integrante_id,
    trim(concat_ws(' ', i.nombres, i.apellidos))::text as nombre,
    i.seccion,
    m.mes,
    exists (
      select 1
      from public.mensualidades mm
      where mm.integrante_id = i.id
        and mm.anio = p_anio
        and mm.mes = m.mes
    ) as pagado
  from public.integrantes i
  cross join lateral (select generate_series(1,12)::integer as mes) m
  where i.activo = true
  order by i.apellidos, i.nombres, m.mes;
$$;

revoke all on function public.resumen_anual_publico(integer) from public;
revoke all on function public.resumen_economia_publica(integer) from public;
revoke all on function public.estado_mensualidades_publico(integer) from public;

grant execute on function public.resumen_anual_publico(integer) to anon, authenticated;
grant execute on function public.resumen_economia_publica(integer) to anon, authenticated;
grant execute on function public.estado_mensualidades_publico(integer) to anon, authenticated;
