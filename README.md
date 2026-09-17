# Caribe Sports Events — Torneos de Baloncesto

Aplicación de torneos de baloncesto (cruces, tabla de posiciones, jugadores y
sanciones) construida con **Vite + React**, conectada a un proyecto real de
**Supabase** (base de datos, autenticación, storage y una Edge Function).

Mantiene la identidad visual del repo original (`style.css`: negro `#070b11`
+ naranja `#ff6b21`, tipografías Inter/Oswald), reorganizada en un proyecto
de componentes en vez de páginas HTML sueltas.

## Estructura de carpetas

```
torneo-app/
├─ index.html
├─ .env.example          # variables de Supabase (copiar a .env)
├─ src/
│  ├─ main.jsx            # punto de entrada, monta Router + Providers
│  ├─ App.jsx             # definición de rutas
│  ├─ index.css           # tokens de diseño y utilidades globales
│  ├─ lib/
│  │  ├─ supabaseClient.js
│  │  ├─ bracket.js       # lógica pura para generar/avanzar el cuadro
│  │  └─ storage.js       # subida de imágenes a Supabase Storage
│  ├─ context/
│  │  └─ AuthContext.jsx  # sesión, perfil y rol del usuario
│  ├─ components/
│  │  ├─ Navbar/
│  │  ├─ Bracket/         # cuadro de eliminación con conectores SVG
│  │  ├─ TeamBadge/
│  │  ├─ Toast/
│  │  └─ ProtectedRoute.jsx
│  └─ pages/
│     ├─ Home/            # landing pública
│     ├─ Login/           # inicio de sesión + cuentas de prueba
│     ├─ Torneos/         # lista de torneos + cuadro + tabla
│     ├─ Jugadores/       # ficha propia (rol jugador) + roster
│     └─ Admin/           # panel de administración por pestañas
│        ├─ Admin.jsx
│        ├─ AdminTorneos.jsx
│        ├─ AdminEquipos.jsx
│        ├─ AdminBracket.jsx
│        ├─ AdminTabla.jsx
│        ├─ AdminJugadores.jsx
│        └─ AdminCuentas.jsx
```

## Puesta en marcha

```bash
npm install
cp .env.example .env   # ya viene con las credenciales del proyecto Supabase creado
npm run dev
```

## Backend (ya está creado y funcionando)

- Proyecto Supabase: `mundial-2026-bracket` (ver `.env` para la URL/clave).
- Tablas: `profiles`, `tournaments`, `teams`, `bracket_matches`, `standings`, `players`.
- RLS: cualquier usuario autenticado puede **leer**; solo el rol `admin` puede **escribir**.
- Tiempo real: habilita la tabla `players` en la publicación `supabase_realtime` desde
  **Supabase → Database → Replication**. Así el roster y la ficha del jugador se
  actualizan sin recargar después de que el administrador guarde una edición.
- Storage: bucket público `mundial-media` para imágenes de torneos y logos de equipos.
- Edge Function `admin-create-user`: permite que **solo un admin** cree cuentas nuevas
  (jugador / usuario / admin) desde la pestaña **Admin → Cuentas de acceso**.

### Actualización requerida: participación de jugadores

Ejecuta el contenido de
`supabase/migrations/20260916_player_match_tracking.sql` en el **SQL Editor**
de Supabase. Añade el campo de partidos suspendidos y activa el tiempo real de
la tabla `players` para que las fichas se actualicen sin recargar. Los partidos
jugados se calculan automáticamente desde los encuentros finalizados del equipo.

Si habías aplicado una versión anterior de esa migración, ejecuta también
`supabase/migrations/20260916_remove_manual_games_played.sql` para quitar el
campo manual de partidos jugados.

## Roles

| Rol       | Puede hacer |
|-----------|-------------|
| `admin`   | Crear torneos (con imagen), añadir equipos (con logo), generar el bracket, cargar marcadores y marcar ganador/eliminado, editar la tabla de posiciones, añadir jugadores con estadísticas y sanciones, y crear nuevas cuentas de acceso. |
| `jugador` | Ver todos los torneos; en **Jugadores** ve resaltada su propia ficha con estadísticas y si tiene una falta/sanción cargada por el admin. |
| `usuario` | Solo lectura: cuadro de cruces, tabla de posiciones y roster de jugadores. |

## Cuentas de prueba

| Rol      | Correo                        | Contraseña      |
|----------|-------------------------------|-----------------|
| Admin    | admin@mundial2026.com         | Admin2026!      |
| Jugador  | jugador1@mundial2026.com      | Jugador2026!    |
| Jugador  | jugador2@mundial2026.com      | Jugador2026!    |
| Usuario  | usuario@mundial2026.com       | Usuario2026!    |

## Flujo para armar un torneo desde cero

1. **Admin → Torneos**: crea el torneo (nombre, descripción, imagen opcional).
2. **Admin → Equipos**: añade cada equipo con su logo. El número de equipos
   debe ser potencia de 2 (2, 4, 8, 16, 32…).
3. Marca los equipos que quieres incluir y pulsa **Generar bracket**.
4. **Admin → Bracket**: carga marcadores y marca el ganador de cada cruce —
   el ganador avanza automáticamente a la siguiente ronda y el perdedor
   queda marcado como eliminado.
5. **Admin → Tabla** y **Admin → Jugadores**: carga la tabla de posiciones y
   el roster con estadísticas/sanciones.
6. **Admin → Cuentas de acceso**: crea el login de un jugador o usuario nuevo.
