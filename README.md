# Chorotegas Latin Band — Sistema Web

Sistema web estático + Supabase para administrar y consultar información de la banda.

## Incluye

- Página pública:
  - Inicio
  - Integrantes
  - Eventos
  - Ensayos
  - Comunicados
- Autenticación con Supabase
- Área privada de integrante
- Panel administrativo
- Roles: `admin`, `director`, `integrante`
- CRUD de:
  - Integrantes
  - Instrumentos
  - Ensayos
  - Eventos
  - Comunicados
- Registro de asistencia por ensayo
- Consulta de asistencia individual
- Políticas RLS de Supabase
- Diseño responsive
- Preparado para GitHub Pages

## 1. Abrir el proyecto

Abre esta carpeta con Visual Studio Code.

Para probarla localmente se recomienda la extensión **Live Server**:
1. Instala Live Server.
2. Clic derecho en `index.html`.
3. `Open with Live Server`.

La página también muestra datos de demostración mientras Supabase no está configurado.

## 2. Crear proyecto en Supabase

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor**.
3. Copia y ejecuta todo el contenido de:
   `supabase/schema.sql`
4. Opcionalmente ejecuta:
   `supabase/datos_demo.sql`

## 3. Conectar el sitio con Supabase

En Supabase:
`Project Settings > API`

Copia:
- Project URL
- anon/public key

Luego abre:

`js/config.js`

Y completa:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "TU_URL",
  SUPABASE_ANON_KEY: "TU_ANON_KEY"
};
```

IMPORTANTE: usa solamente la **anon key** en el navegador.
Nunca pongas la `service_role` key en este proyecto.

## 4. Crear el primer administrador

1. Abre `login.html`.
2. Registra tu cuenta.
3. En Supabase > SQL Editor abre:
   `supabase/hacer_admin.sql`
4. Cambia `TU_CORREO@EJEMPLO.COM` por tu correo.
5. Ejecuta el SQL.
6. Cierra sesión y vuelve a entrar.

Ya podrás entrar al panel administrativo.

## 5. Roles

### Administrador
- Acceso completo.
- Gestiona integrantes, instrumentos, ensayos, eventos y comunicados.
- Registra asistencia.
- Cambia roles de usuarios.
- Puede eliminar integrantes.

### Director
- Consulta integrantes.
- Crea y edita integrantes.
- Registra asistencia.
- Crea, edita y elimina ensayos, eventos y comunicados.
- No administra instrumentos ni roles.

### Integrante
- Consulta páginas públicas.
- Ve su perfil.
- Ve únicamente su propia asistencia.

## 6. Vincular una cuenta con un integrante

Cuando un integrante se registra:
1. Ve al panel administrativo.
2. Abre `Integrantes`.
3. Crea o edita al integrante.
4. En “Cuenta de usuario vinculada” selecciona su cuenta.
5. Guarda.

Después podrá ver su asistencia desde `Mi cuenta`.

## 7. GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube todos los archivos de esta carpeta.
3. En GitHub:
   `Settings > Pages`
4. Source: `Deploy from a branch`
5. Branch: `main`
6. Folder: `/root`
7. Guarda.

En Supabase revisa:
`Authentication > URL Configuration`

Configura:
- Site URL con la URL de GitHub Pages.
- Agrega también tu URL local de Live Server a Redirect URLs si fuera necesario.

## Estructura

```text
chorotegas-latin-band-completo/
├── index.html
├── integrantes.html
├── eventos.html
├── ensayos.html
├── comunicados.html
├── login.html
├── mi-cuenta.html
├── css/
│   ├── style.css
│   └── admin.css
├── js/
│   ├── config.js
│   ├── core.js
│   ├── public.js
│   ├── auth.js
│   └── member.js
├── admin/
│   ├── index.html
│   ├── integrantes.html
│   ├── asistencia.html
│   ├── ensayos.html
│   ├── eventos.html
│   ├── comunicados.html
│   ├── instrumentos.html
│   ├── usuarios.html
│   └── js/
├── assets/
│   └── img/
│       └── logo.png
└── supabase/
    ├── schema.sql
    ├── hacer_admin.sql
    └── datos_demo.sql
```

## Seguridad

El proyecto usa Row Level Security (RLS) en Supabase.
Los permisos importantes se validan en la base de datos, no solamente ocultando botones en JavaScript.

La `anon key` es apropiada para una aplicación web pública cuando RLS está configurado correctamente.
No subas una `service_role` key a GitHub.


## Fotos PNG de integrantes

Las fotos pueden guardarse dentro de:

`assets/img/integrantes/`

Ejemplo:

`assets/img/integrantes/juan-perez.png`

Después, desde **Panel administrativo > Integrantes**, pega esa ruta en el campo **Foto PNG**.

La página de integrantes ahora agrupa automáticamente a las personas por el valor escrito en **Sección**.  
Por ejemplo:

- Saxofones
- Cuadro Artístico
- Fusión

Al tocar una sección se despliegan sus integrantes.

Si ya habías creado la base de datos con la versión anterior, ejecuta una sola vez:

`supabase/migracion_foto_integrantes.sql`
