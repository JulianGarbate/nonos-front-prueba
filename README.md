# NONOS — Frontend

Web app (responsive, instalable como PWA) de NONOS, la plataforma de acompañamiento para adultos mayores. Consume el backend [`nonos-back`](https://github.com/JulianGarbate/nonos-back) y sigue el alcance de **NONOS DEFINIDO**: tres tipos de usuario (adulto mayor, familiar y cuidador físico/digital), sin cuenta de médico —solo el acceso de emergencia por QR + código temporal—, sin control de tomas.

Stack: **Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · lucide-react · axios · qrcode.react**.

## Cómo levantarlo

```bash
npm install
cp .env.example .env.local   # completar
npm run dev -- -p 3001       # el backend usa el 3000 y permite CORS desde el 3001
```

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend (por defecto `http://localhost:3000`). |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID de Google Sign-In (público). |

Para que la vinculación con Google Health vuelva a la app, el backend necesita `FRONTEND_URL=http://localhost:3001` (redirige a `/adulto-mayor/dispositivos?conectado=1|0`) y `CORS_ORIGINS` con el origen del front.

### Cuentas de prueba

`node scripts/seed-qa.mjs` crea (usando solo la API pública del backend) un adulto mayor, una cuidadora y un familiar ya vinculados, con medicación, ficha de salud, historial, notas y QR. Las credenciales están en el propio script. Es idempotente.

> El login del backend tiene un límite de 5 intentos cada 15 minutos por IP: la pantalla lo informa.

## Qué hay para cada rol

**Adulto mayor** (móvil primero; barra lateral en escritorio)
- Inicio con saludo, botón de ayuda, próximas tomas del día (solo muestra qué corresponde, no se confirma), estado de la pulsera y de la red.
- Emergencia: S.O.S con confirmación, y código temporal + QR de la pulsera (`/qr/*`).
- Alertas pendientes con cuenta regresiva (`ventanaExpiraEn`): “Estoy bien / Necesito ayuda”.
- Medicación con historial de cambios, ficha de salud (condiciones, alergias, contactos, medidas anticipadas), historial de acontecimientos.
- Red de cuidado: prioridad de contactos de emergencia, cambio de rol de cada persona, invitaciones.
- Pulsera y botón: vinculación con Google Health, sincronización, **carga del historial completo con progreso**, botón físico (la clave se muestra una sola vez) y datos recibidos con gráficos y rango habitual.
- Avisos (notificaciones) y perfil, con accesibilidad.

**Familiar / cuidador**
- Panel por persona acompañada (con selector): resumen con estado, últimas 24 h de signos vitales, alertas (filtros, escalado, comentarios de feedback), medicación, ficha, datos de la pulsera, historial, notas compartidas y preferencias de avisos por tipo (incluye `FC_BAJA`).
- Avisos con agrupación por día, invitaciones y perfil.

**Público (médico de emergencia)**: `/emergencia/<id>` → código de 6 dígitos → perfil de emergencia curado.

## Transversal

- **Web Push**: `public/sw.js` + `src/lib/push.ts` (VAPID desde `/push-tokens/vapid/public-key`, alta y baja en `/push-tokens`). Se pide desde el perfil o el aviso superior; al cerrar sesión el navegador se da de baja.
- **Accesibilidad** (`/perfil`): tema automático/claro/oscuro, tamaño de texto (normal, grande, muy grande), alto contraste y reducción de animaciones (se respeta también `prefers-reduced-motion`). Enlace “Saltar al contenido”, foco visible, objetivos táctiles de 44 px o más.
- **Diseño**: todo el color sale de tokens CSS (`src/app/globals.css`); animaciones y transiciones propias (sin librerías), incluida la transición entre pantallas (`(app)/template.tsx`).
- **Instalable**: `manifest.ts` e íconos generados en el servidor (`/pwa-icon/<tamaño>`).
- Estado de conexión: aviso sin internet y estado del servidor (`/health`) en el login.

## Estructura

```
src/app
  (app)/             pantallas con sesión (comparten AppShell: navegación que persiste)
    adulto-mayor/    inicio, medicación, emergencia, red, ficha, historial, dispositivos, avisos, más
    familiar/        panel y avisos
    invitaciones/ perfil/ avisos/
  login/ registro/   autenticación (Google + email)
  emergencia/[qrId]/ acceso público de emergencia
  api/emergencia/    proxy: el backend lee el código en el body de un GET
src/components       ui.tsx (sistema de diseño), feedback.tsx (toasts y confirmaciones), AppShell, care/…
src/lib              api.ts (todos los contratos del backend), auth, push, preferencias, formatos
```

## Notas de integración

- `GET /qr/:id` recibe el código en el **body**, y los navegadores no pueden enviar body en un GET: por eso existe el proxy `src/app/api/emergencia/[qrId]/route.ts` (usa `node:http`).
- Los tokens (JWT de 15 min + refresh token) viven en `localStorage`; un interceptor de axios renueva y reintenta una vez.
- Límites de uso del backend (login, QR público, S.O.S) responden `429`: `mensajeDeError` los traduce.
- El backend no incluye nombre ni email de la otra persona en `GET /usuarios/:id/vinculos` ni en las invitaciones recibidas, y `GET /usuarios/:id` da 403 sin vínculo “hacia” ese usuario. Mientras tanto, la red del adulto mayor deduce el email desde las invitaciones enviadas y lo recuerda en el navegador.

## Comandos

```bash
npm run dev      # desarrollo
npm run build    # producción
npm run lint     # ESLint (las reglas de effects del compilador de React están en "warn")
```
