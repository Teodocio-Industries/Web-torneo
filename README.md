# Caribe Sports Events — Torneos de Baloncesto

Aplicación de torneos de baloncesto (cruces, tabla de posiciones, jugadores y
sanciones) construida con **Vite + React**, conectada a un proyecto real de
**Supabase** (base de datos, autenticación, storage y una Edge Function).

Mantiene la identidad visual del repo original (`style.css`: negro `#070b11`
+ naranja `#ff6b21`, tipografías Inter/Oswald), reorganizada en un proyecto
de componentes en vez de páginas HTML sueltas.

## Novedades de esta versión

- **Bracket a pantalla completa**: el cuadro de cruces ya no vive dentro de una
  tarjeta angosta; ocupa todo el ancho de la pantalla en la pestaña
  "Cuadro de cruces" de Torneos.
- **Edición de equipos y jugadores**: en Admin → Equipos y Admin → Jugadores
  ahora hay botón "Editar" en cada fila (además de "Eliminar"), no solo alta.
- **Página individual por jugador** (`/jugador/:id`): ficha, sanción y dos
  gráficos (sus estadísticas y comparación contra el promedio del torneo),
  visible para cualquier usuario logueado (admin, jugador o usuario normal).
  Se llega haciendo clic en el nombre de cualquier jugador en Torneos →
  Estadísticas o en Jugadores.
- **Pestaña "Estadísticas"** en Torneos: gráficos generales del torneo
  (máximos anotadores, puntos por equipo, proporción de sancionados).
- **Tiempo real**: cambios que haga el admin (marcador, ganador, tabla,
  jugadores) se reflejan al instante para todos los que estén viendo el
  torneo, sin recargar la página (Supabase Realtime).

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
│  │  ├─ storage.js       # subida de imágenes a Supabase Storage
│  │  └─ useRealtimeRefresh.js  # hook de suscripción en tiempo real
│  ├─ context/
│  │  └─ AuthContext.jsx  # sesión, perfil y rol del usuario
│  ├─ components/
│  │  ├─ Navbar/
│  │  ├─ Bracket/         # cuadro de eliminación a pantalla completa (conectores SVG)
│  │  ├─ TeamBadge/
│  │  ├─ Toast/
│  │  ├─ TournamentStats/ # gráficos generales del torneo (recharts)
│  │  ├─ PlayerCharts/    # gráficos individuales de un jugador (recharts)
│  │  └─ ProtectedRoute.jsx
│  └─ pages/
│     ├─ Home/            # landing pública
│     ├─ Login/           # inicio de sesión + cuentas de prueba
│     ├─ Torneos/         # lista de torneos + cuadro + tabla + estadísticas
│     ├─ Jugadores/       # ficha propia (rol jugador) + roster
│     ├─ PlayerProfile/   # página pública /jugador/:id con gráficos
│     └─ Admin/           # panel de administración por pestañas
│        ├─ Admin.jsx
│        ├─ AdminTorneos.jsx
│        ├─ AdminEquipos.jsx   (alta, edición y borrado de equipos)
│        ├─ AdminBracket.jsx
│        ├─ AdminTabla.jsx
│        ├─ AdminJugadores.jsx (alta, edición y borrado de jugadores)
│        └─ AdminCuentas.jsx
```

## Novedades de esta versión (panel admin)

- **Eliminar torneos**: en Admin → Torneos, cada tarjeta tiene un botón ✕ para
  borrar el torneo completo (equipos, jugadores, bracket y tabla incluidos).
- **Panel admin con barra lateral**: nuevo layout tipo dashboard (sidebar fija
  con las pestañas + selector de torneo arriba), responsive con menú
  hamburguesa en pantallas angostas.
- **Biblioteca de equipos y jugadores reutilizable**: en Admin → Equipos hay
  una sección "Biblioteca de equipos" para crear equipos que quedan guardados
  para siempre (tablas nuevas `team_catalog` / `team_catalog_players`, ver
  `supabase_migration_catalogo.sql`). Al crear un equipo es obligatorio
  cargarle al menos un jugador con sus estadísticas (con una gráfica de
  vista previa). Luego, con un clic ("Agregar a este torneo") ese equipo y su
  plantilla completa se copian a cualquier torneo, sin volver a cargarlos.
- **Bracket admin = bracket público + arrastrar y soltar**: Admin → Bracket
  ahora reutiliza el mismo componente visual que ven los espectadores en
  Torneos. El bracket se genera con todos los casilleros vacíos y, debajo,
  aparece la lista de equipos guardados del torneo: se arrastran hacia el
  casillero vacío que corresponda en la primera ronda. Un botón ✕ sobre el
  equipo permite quitarlo del casillero mientras el cruce siga pendiente.
- **Jugadores seccionados por equipo**: Admin → Jugadores muestra primero la
  biblioteca de equipos con sus jugadores guardados (clic → página propia con
  estadísticas y gráfica, en `/jugador-biblioteca/:id`), y abajo el roster del
  torneo actual agrupado por equipo.

### ⚠️ Paso obligatorio antes de usar lo anterior

Ejecuta una vez el archivo `supabase_migration_catalogo.sql` en
**Supabase → SQL Editor** (proyecto `mundial-2026-bracket`). Crea las tablas
`team_catalog` y `team_catalog_players`, agrega las columnas `catalog_id` en
`teams` y `catalog_player_id` en `players`, y sus políticas RLS (mismo
criterio que el resto de la app: lectura para autenticados, escritura solo
`admin`). No borra ni modifica ningún dato existente.

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
- Storage: bucket público `mundial-media` para imágenes de torneos y logos de equipos.
- Edge Function `admin-create-user`: permite que **solo un admin** cree cuentas nuevas
  (jugador / usuario / admin) desde la pestaña **Admin → Cuentas de acceso**.

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