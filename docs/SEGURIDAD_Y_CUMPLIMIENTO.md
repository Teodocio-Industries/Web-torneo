# Seguridad y cumplimiento — Caribe Sports

> Guía técnica, no asesoría legal. Haz revisar los textos de `src/pages/Legal/` por un abogado colombiano antes de publicar.

## 0. URGENTE (hazlo hoy)

1. **Cuentas demo públicas.** `admin@mundial2026.com` / `Admin2026!` (y 3 más) estuvieron visibles en el login y en el README, y esa cuenta es el **único administrador** de la base de datos. Cualquiera pudo entrar como admin.
   - Crea tu admin real (Supabase → Authentication → Users → *Add user*; en la tabla `profiles` pon `role = 'admin'`).
   - Inicia sesión con él y **elimina las 4 cuentas demo**.
   - Asume esas claves como comprometidas aunque el código ya no las muestre (siguen en el historial de GitHub).
2. **Aplica la migración** `supabase/migrations/20261001_seguridad_y_consentimientos.sql` (SQL Editor). Corrige la escalada de privilegios a admin (`profiles_insert_admin`), la lectura de todos los perfiles por cualquier usuario, limita las subidas y crea `consent_records`.
3. **Desactiva el registro público** si no lo usas: Authentication → Sign In / Providers → *Allow new users to sign up* = OFF.

## 1. Configuración en Supabase (protección real en el servidor)

- Authentication → **Rate Limits**: baja los límites de inicio de sesión por IP.
- Authentication → **Attack Protection → CAPTCHA**: activa *Cloudflare Turnstile*. Orden: primero publica el sitio con el secreto de GitHub Actions `VITE_TURNSTILE_SITE_KEY` y **después** activa el CAPTCHA en Supabase; al revés, nadie podría iniciar sesión.
- Contraseña mínima ≥ 10; *leaked password protection* si tu plan lo permite; MFA para el admin.
- La edge function `admin-create-user` ya valida el rol admin en el servidor (`verify_jwt = true`); mantenlo así.

## 2. Anti-DDoS

GitHub Pages ya está tras el CDN de GitHub y Supabase tiene protección propia, pero **ningún código del front-end sustituye un WAF**. Recomendado: dominio propio con **Cloudflare (gratis)** delante: reglas de rate limiting, modo *Under Attack*, y cabeceras (HSTS, `X-Frame-Options`, `frame-ancestors`) que GitHub Pages no permite.

En el código: CSP por meta-tag, anti-enmarcado, freno de intentos en login (cliente, solo disuasorio), señuelo anti-bots, Turnstile opcional, validación de subidas (tipo, 5 MB, nombre aleatorio) y URLs de imagen solo `https`.

## 3. Datos del negocio

Completa `src/config/negocio.js`. Hasta entonces las páginas muestran `[COMPLETAR]` en amarillo. `npm run check:legal -- --strict` falla si falta algo.

## 4. Cookies

No hay analítica, publicidad, píxeles ni fuentes de terceros (ahora son locales). Solo se guarda la sesión y el contador de intentos de login: **no hace falta banner**, sí informar (hecho). Si agregas Google Analytics, Meta Pixel, etc., necesitas consentimiento previo con opción de rechazar.

## 5. Riesgos que decides tú

| Riesgo | Qué hacer |
|---|---|
| **Menores (U19)**: fotos y estadísticas en redes | Autorización escrita del representante legal y guardar la prueba (`consent_records`). Es el mayor riesgo legal. |
| Frases «máxima visibilidad», «mayor alcance» | Evita prometer resultados (publicidad engañosa, Ley 1480). Ya hay aviso de no garantía; considera suavizar el texto en `service_tiers`. |
| Pagos a Nequi/Bancolombia personales | Consulta a un contador: RUT, facturación electrónica (DIAN), impuestos. |
| Registro Nacional de Bases de Datos (SIC) | Solo obligatorio sobre 100.000 UVT en activos; igual debes tener política y atender solicitudes. |
| WhatsApp comercial | Ley 2300 de 2023: sin consentimiento y fuera de horario no se puede contactar para promociones. |
| Logo generado con IA | Protección por derechos de autor incierta; registra la marca y verifica el origen de cada imagen. |
| Textos de reembolso (10 días hábiles, descuento proporcional, licencia de piezas) | Son valores por defecto; son decisiones comerciales tuyas. Ajusta `Reembolsos.jsx` / `Terminos.jsx`. |
| Supabase / GitHub fuera de Colombia | Acepta sus acuerdos de tratamiento de datos (DPA). |
| Arrastrar y soltar del cuadro (admin) | Solo mouse; falta alternativa de teclado. |