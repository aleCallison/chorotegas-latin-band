-- Opcional: datos de ejemplo
insert into public.instrumentos (nombre,seccion) values
('Trompeta','Metales'),
('Trombón','Metales'),
('Saxofón alto','Saxofones'),
('Percusión','Ritmo')
on conflict (nombre) do nothing;

insert into public.eventos (nombre,fecha,hora,lugar,descripcion,publicado)
values ('Presentación de Chorotegas Latin Band', current_date + 14, '18:00', 'Choluteca, Honduras', 'Presentación musical de la banda.', true);

insert into public.ensayos (titulo,fecha,hora_inicio,lugar,descripcion,publicado)
values ('Ensayo general', current_date + 3, '18:00', 'Salón de ensayo', 'Repaso general del repertorio.', true);

insert into public.comunicados (titulo,contenido,fecha_publicacion,publicado)
values ('Bienvenidos al nuevo sistema', 'Desde este sitio podrán consultar ensayos, eventos y comunicados de Chorotegas Latin Band.', current_date, true);
