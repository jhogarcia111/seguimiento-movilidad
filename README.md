# Transito Tito - Seguimiento a la movilidad

## 📋 Descripción

Aplicación Next.js (monorepo unificado) que consulta y reporta problemas de movilidad en Bogotá en tiempo real. Combina fuentes oficiales (`bogota.gov.co`, cuentas de Twitter de @SectorMovilidad, @BogotaTransito, @TransMilenio) en una sola interfaz con búsqueda por sector, mapas interactivos y panel de administración.

## 🛠️ Stack

- **Framework**: Next.js 15 (App Router) + React 18 + JavaScript
- **Backend**: Route Handlers de Next.js (`app/api/.../route.js`)
- **Base de datos**: PostgreSQL (Neon)
- **Auth**: JWT (`jsonwebtoken` + `bcrypt`)
- **Scraping**: `puppeteer` en local · `puppeteer-core` + `@sparticuz/chromium` en Vercel
- **Twitter API**: v2 (Bearer token)
- **Mapas**: Leaflet + React-Leaflet (cargados con `next/dynamic({ ssr: false })`)
- **PWA**: `@ducanh2912/next-pwa`
- **Streaming**: SSE nativo con `ReadableStream` para búsquedas en tiempo real

## 🌐 Puertos / URLs

- Local: `http://localhost:4051`
- API: `http://localhost:4051/api/*`

## 🗄️ Base de datos

PostgreSQL serverless en [Neon](https://neon.tech). Configura `DATABASE_URL` con la cadena de conexión completa (`sslmode=require`).

Las tablas se crean automáticamente al primer arranque (idempotente: `CREATE TABLE IF NOT EXISTS`).

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env.local` y completa las variables:

```bash
cp .env.example .env.local
```

Variables obligatorias:

- `DATABASE_URL` — Neon Postgres (`postgresql://...`)
- `JWT_SECRET` — secreto para firmar tokens
- `TWITTER_BEARER_TOKEN` — token de Twitter API v2 (opcional pero recomendado)

Variables opcionales:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `FRONTEND_URL` (para links en emails)
- `JWT_EXPIRES_IN` (default `7d`)
- `BOOTSTRAP_ADMIN_USERNAMES` — lista de usuarios ya registrados que se promueven a administrador al iniciar la app; si no la defines, por defecto se intenta con `Jho`. Pon `BOOTSTRAP_ADMIN_USERNAMES=` vacío para no promover a nadie por defecto. También puedes usar `npm run promote-admin -- Jho` una sola vez.

### 3. Iniciar en desarrollo

```bash
npm run dev
```

La app queda disponible en `http://localhost:4051`. Las rutas y la API viven en el mismo dominio (sin CORS, sin proxy).

### 4. Build producción

```bash
npm run build
npm run start
```

## 🚢 Deploy en Vercel

1. Importa el repo en Vercel.
2. Vercel auto-detecta Next.js — no se necesita `vercel.json`.
3. Configura las env vars en `Settings → Environment Variables`:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `TWITTER_BEARER_TOKEN`
   - `SMTP_*` (si vas a enviar emails)
   - `FRONTEND_URL` = `https://tu-dominio.vercel.app`
4. Las rutas con scraping (`/api/test/scrape`, `/api/mobility/general`, etc.) usan `runtime = 'nodejs'` y `maxDuration = 60`.
5. Puppeteer en serverless usa `@sparticuz/chromium` automáticamente (detectado por `process.env.VERCEL`).

## 🗂️ Estructura

```
/
  app/
    layout.jsx, providers.jsx
    (main)/               <- layout con header/nav (Layout component)
      page.jsx            <- HomePage
      buscar/             <- búsqueda por sector (SSE)
      dashboard/          <- dashboard usuario
      admin/              <- panel admin
      test-scraping/      <- pruebas de scraping
    login/                <- públicas (sin Layout)
    pending-approval/
    account-activated/
    api/                  <- Route Handlers
      auth/{login,register,me,logout,app-open}/route.js
      mobility/{sector,general,refresh}/route.js
      user/search/route.js  (SSE)
      user/searches/{,[id]/results}/route.js
      admin/...           <- 18+ endpoints admin
      test/scrape/route.js
      health/route.js
  lib/                    <- código server-only
    db/                   <- pool singleton, modelos
    services/             <- lógica de negocio (auth, mobility, twitter, waze...)
    middleware/auth.js    <- requireAuth / requireAdmin / requireActiveUser
    utils/
    puppeteer.js          <- helper dual local/Vercel
  components/             <- React (client components)
  contexts/, hooks/, services/
  styles/, public/
```

## 📚 Documentación adicional

- [**Inventario de funciones + matriz Vercel/Next.js**](./FEATURES_INVENTORY.md) — endpoints, páginas, servicios y compatibilidad con cada plan de Vercel
- [**Changelog (Semantic Versioning)**](./CHANGELOG.md) — historial completo de cambios por versión
- [Plan de migración a Next.js (progreso)](./MIGRATION_NEXTJS_PROGRESS.md)
- [Guía de Integración con Cursor](./docs/GUIA_CURSOR_SEGUIMIENTO_MOVILIDAD.md)
- [Guía de Debug Móvil](./docs/GUIA_DEBUG_MOVIL.md)
- [Fuentes de datos](./docs/FUENTES_DATOS_MOVILIDAD.md)

## 🔧 Scripts

```bash
npm run dev               # Next.js en modo desarrollo (puerto 4051)
npm run build             # Build de producción
npm run start             # Servir build de producción
npm run lint              # ESLint (next/core-web-vitals)
npm run promote-admin     # Promueve usuarios a admin (ej: npm run promote-admin -- Jho)
```

En Windows puedes usar los `.bat`:

```bat
start-server.bat
stop-server.bat
restart-server-Fixed-Seguimiento_Movilidad.bat
```
