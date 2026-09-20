-- Después de registrarte desde login.html, reemplaza el correo y ejecuta:
update public.profiles
set rol = 'admin'
where email = 'TU_CORREO@EJEMPLO.COM';

-- Comprueba el resultado:
select id, nombre, email, rol from public.profiles order by created_at desc;
