-- Ejecuta este archivo SOLO si ya habías creado la base de datos con una versión anterior.
alter table public.integrantes
add column if not exists foto_url text;
