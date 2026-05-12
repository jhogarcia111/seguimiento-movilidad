# Migración a Next.js (App Router) — Progreso

> Documento vivo. Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `[!]` bloqueado/atención

## Resumen de la decisión

- **Stack final**: Next.js 15 con **App Router**, JavaScript puro (sin TS), React 18.
- **Arquitectura**: monorepo unificado en la raíz (un solo `package.json`, un solo deploy en Vercel).
- **Backend**: Express → Route Handlers de Next.js bajo `app/api/.../route.js`.
- **DB**: PostgreSQL en Neon (sin cambios), pool singleton compatible con hot reload.
- **Scraping**: `puppeteer-core` + `@sparticuz/chromium` en serverless; `puppeteer` normal en local.
- **PWA**: `@ducanh2912/next-pwa` (reemplaza `vite-plugin-pwa`).
- **Mapas Leaflet**: cargados con `next/dynamic({ ssr: false })`.
- **SSE**: `POST /api/user/search` reescrito a `ReadableStream` nativo.

## Estructura objetivo

```
/
  package.json            <- único (Next + React + deps backend)
  next.config.mjs
  jsconfig.json           <- alias @/*
  .env.example
  app/
    layout.jsx
    providers.jsx
    page.jsx              <- HomePage
    login/page.jsx
    pending-approval/page.jsx
    account-activated/page.jsx
    (protected)/
      buscar/page.jsx
      dashboard/page.jsx
      admin/page.jsx
      test-scraping/page.jsx
    api/
      health/route.js
      auth/{login,register,me,logout,app-open}/route.js
      mobility/{sector,general,refresh}/route.js
      user/search/route.js
      user/searches/route.js
      user/searches/[id]/results/route.js
      admin/.../route.js
      test/scrape/route.js
  lib/                    <- server-only
    db/{pool,init,activities,apiStats,incidents,notifications}.js
    services/*.js
    middleware/auth.js    <- requireAuth, requireAdmin, requireActiveUser
    utils/*.js
    puppeteer.js
  components/             <- 'use client'
  contexts/
  hooks/
  services/               <- axios client (api.js)
  styles/
  public/                 <- favicons, manifest, videos/
```

## Endpoints API (≈30)

| Origen Express | Destino Next.js | Auth | Estado |
| --- | --- | --- | --- |
| `GET /health` | `app/api/health/route.js` | – | `[x]` |
| `POST /api/auth/login` | `app/api/auth/login/route.js` | – | `[x]` |
| `POST /api/auth/register` | `app/api/auth/register/route.js` | – | `[x]` |
| `GET /api/auth/me` | `app/api/auth/me/route.js` | user | `[x]` |
| `POST /api/auth/logout` | `app/api/auth/logout/route.js` | user | `[x]` |
| `POST /api/auth/app-open` | `app/api/auth/app-open/route.js` | user | `[x]` |
| `GET /api/mobility/sector` | `app/api/mobility/sector/route.js` | – | `[x]` |
| `GET /api/mobility/general` | `app/api/mobility/general/route.js` | – | `[x]` |
| `GET /api/mobility/refresh` | `app/api/mobility/refresh/route.js` | – | `[x]` |
| `POST /api/user/search` (SSE) | `app/api/user/search/route.js` | user+active | `[x]` |
| `GET /api/user/searches` | `app/api/user/searches/route.js` | user+active | `[x]` |
| `GET /api/user/searches/:id/results` | `app/api/user/searches/[id]/results/route.js` | user+active | `[x]` |
| `GET /api/admin/sources` | `app/api/admin/sources/route.js` GET | admin | `[x]` |
| `POST /api/admin/sources` | `app/api/admin/sources/route.js` POST | admin | `[x]` |
| `PUT /api/admin/sources/:id` | `app/api/admin/sources/[id]/route.js` PUT | admin | `[x]` |
| `DELETE /api/admin/sources/:id` | `app/api/admin/sources/[id]/route.js` DELETE | admin | `[x]` |
| `GET /api/admin/tags` | `app/api/admin/tags/route.js` GET | admin | `[x]` |
| `POST /api/admin/tags` | `app/api/admin/tags/route.js` POST | admin | `[x]` |
| `GET /api/admin/users` | `app/api/admin/users/route.js` GET | admin | `[x]` |
| `POST /api/admin/users` | `app/api/admin/users/route.js` POST | admin | `[x]` |
| `PUT /api/admin/users/:id` | `app/api/admin/users/[id]/route.js` PUT | admin | `[x]` |
| `DELETE /api/admin/users/:id` | `app/api/admin/users/[id]/route.js` DELETE | admin | `[x]` |
| `PUT /api/admin/users/:id/approve` | `app/api/admin/users/[id]/approve/route.js` | admin | `[x]` |
| `GET /api/admin/activities` | `app/api/admin/activities/route.js` | admin | `[x]` |
| `GET /api/admin/analytics/stats` | `app/api/admin/analytics/stats/route.js` | admin | `[x]` |
| `GET /api/admin/searches/:id/results` | `app/api/admin/searches/[id]/results/route.js` | admin | `[x]` |
| `GET /api/admin/api-status` | `app/api/admin/api-status/route.js` | admin | `[x]` |
| `GET /api/admin/notifications` | `app/api/admin/notifications/route.js` GET | admin | `[x]` |
| `GET /api/admin/notifications/count` | `app/api/admin/notifications/count/route.js` | admin | `[x]` |
| `PATCH /api/admin/notifications/:id/read` | `app/api/admin/notifications/[id]/read/route.js` | admin | `[x]` |
| `PATCH /api/admin/notifications/read-all` | `app/api/admin/notifications/read-all/route.js` | admin | `[x]` |
| `GET /api/admin/config` | `app/api/admin/config/route.js` | admin | `[x]` |
| `GET /api/admin/config/:key` | `app/api/admin/config/[key]/route.js` GET | admin | `[x]` |
| `PUT /api/admin/config/:key` | `app/api/admin/config/[key]/route.js` PUT | admin | `[x]` |
| `GET /api/admin/logs` | `app/api/admin/logs/route.js` GET | admin | `[x]` |
| `POST /api/admin/logs` | `app/api/admin/logs/route.js` POST | admin | `[x]` (degradado en VERCEL) |
| `POST /api/test/scrape` | `app/api/test/scrape/route.js` | user+active | `[x]` |

## Servicios (lib/services/)

| Archivo origen | Destino | Notas | Estado |
| --- | --- | --- | --- |
| `backend/src/services/authService.js` | `lib/services/authService.js` | JWT + bcrypt | `[x]` |
| `backend/src/services/mobilityService.js` | `lib/services/mobilityService.js` | core de búsqueda | `[x]` |
| `backend/src/services/twitterService.js` | `lib/services/twitterService.js` | Twitter API v2 (sin dotenv) | `[x]` |
| `backend/src/services/twitterScrapingService.js` | `lib/services/twitterScrapingService.js` | usa `lib/puppeteer.js` | `[x]` |
| `backend/src/services/wazeService.js` | `lib/services/wazeService.js` | usa `lib/puppeteer.js` | `[x]` |
| `backend/src/services/scrapingService.js` | `lib/services/scrapingService.js` | sin puppeteer | `[x]` |
| `backend/src/services/aiValidationService.js` | `lib/services/aiValidationService.js` | – | `[x]` |
| `backend/src/services/geocodingService.js` | `lib/services/geocodingService.js` | sin dotenv | `[x]` |
| `backend/src/services/nlpService.js` | `lib/services/nlpService.js` | `compromise` + `natural` | `[x]` |
| `backend/src/services/sourcesService.js` | `lib/services/sourcesService.js` | – | `[x]` |
| `backend/src/services/configService.js` | `lib/services/configService.js` | – | `[x]` |
| `backend/src/services/emailService.js` | `lib/services/emailService.js` | Nodemailer (sin dotenv) | `[x]` |

## Módulos DB (lib/db/)

| Archivo origen | Destino | Notas | Estado |
| --- | --- | --- | --- |
| `backend/src/database/db.js` | `lib/db/db.js` | pool singleton via `globalThis`, `ensureDatabaseInitialized()` idempotente | `[x]` |
| `backend/src/database/activities.js` | `lib/db/activities.js` | – | `[x]` |
| `backend/src/database/apiStats.js` | `lib/db/apiStats.js` | – | `[x]` |
| `backend/src/database/incidents.js` | `lib/db/incidents.js` | – | `[x]` |
| `backend/src/database/notifications.js` | `lib/db/notifications.js` | – | `[x]` |

## Utils (lib/utils/)

| Archivo origen | Destino | Notas | Estado |
| --- | --- | --- | --- |
| `backend/src/utils/contentExtractor.js` | `lib/utils/contentExtractor.js` | – | `[x]` |
| `backend/src/utils/encryption.js` | `lib/utils/encryption.js` | – | `[x]` |
| `backend/src/utils/logCapture.js` | `lib/utils/logCapture.js` | escribir a disco solo si `!VERCEL`, intercept guardado en `globalThis` | `[x]` |
| `backend/src/utils/logReader.js` | `lib/utils/logReader.js` | – | `[x]` |

## Middleware

| Origen | Destino | Notas | Estado |
| --- | --- | --- | --- |
| `backend/src/middleware/auth.js` | `lib/middleware/auth.js` (`requireAuth(request, { admin?, active? })`) | helpers que devuelven `{ user }` o `NextResponse` 401/403 | `[x]` |

## Páginas (app/)

| Origen | Destino | Notas | Estado |
| --- | --- | --- | --- |
| `frontend/src/pages/HomePage.jsx` | `app/(main)/page.jsx` | `'use client'`, dentro de Layout | `[x]` |
| `frontend/src/pages/LoginPage.jsx` | `app/login/page.jsx` | `'use client'`, sin Layout | `[x]` |
| `frontend/src/pages/PendingApprovalPage.jsx` | `app/pending-approval/page.jsx` | `'use client'`, sin Layout | `[x]` |
| `frontend/src/pages/AccountActivatedPage.jsx` | `app/account-activated/page.jsx` | `'use client'`, sin Layout | `[x]` |
| `frontend/src/pages/DashboardPage.jsx` | `app/(main)/dashboard/page.jsx` | `'use client'` + `ProtectedRoute` + `dynamic(LocationMap)` | `[x]` |
| `frontend/src/pages/AdminDashboardPage.jsx` | `app/(main)/admin/page.jsx` | `'use client'` + `ProtectedRoute requireAdmin` + `dynamic(LocationMap)` | `[x]` |
| `frontend/src/pages/SectorSearch.jsx` | `app/(main)/buscar/page.jsx` | `'use client'` + `ProtectedRoute` + `dynamic(AnimatedMap/LocationMap)` + SSE | `[x]` |
| `frontend/src/pages/TestScraping.jsx` | `app/(main)/test-scraping/page.jsx` | `'use client'` + `ProtectedRoute requireAdmin` + `dynamic(AnimatedMap)` | `[x]` |

## Componentes (components/)

| Origen | Destino | Notas | Estado |
| --- | --- | --- | --- |
| `frontend/src/components/AnimatedMap.jsx` | `components/AnimatedMap.jsx` | `'use client'`, importado vía `next/dynamic({ssr:false})` desde páginas | `[x]` |
| `frontend/src/components/LocationMap.jsx` | `components/LocationMap.jsx` | `'use client'`, importado vía `next/dynamic({ssr:false})` | `[x]` |
| `frontend/src/components/ConfirmModal.jsx` | `components/ConfirmModal.jsx` | `'use client'` | `[x]` |
| `frontend/src/components/ErrorMessage.jsx` | `components/ErrorMessage.jsx` | `'use client'` (precaución) | `[x]` |
| `frontend/src/components/IncidentCard.jsx` | `components/IncidentCard.jsx` | `'use client'` | `[x]` |
| `frontend/src/components/IncidentList.jsx` | `components/IncidentList.jsx` | `'use client'` | `[x]` |
| `frontend/src/components/Layout.jsx` | `components/Layout.jsx` | `'use client'`, reescrito con `next/link` + `usePathname` + `useRouter` | `[x]` |
| `frontend/src/components/LoadingScreen.jsx` | `components/LoadingScreen.jsx` | `'use client'` | `[x]` |
| `frontend/src/components/LoadingSpinner.jsx` | `components/LoadingSpinner.jsx` | `'use client'` | `[x]` |
| `frontend/src/components/LogViewer.jsx` | `components/LogViewer.jsx` | `'use client'` | `[x]` |
| `frontend/src/components/Notifications.jsx` | `components/Notifications.jsx` | `'use client'`, `useRouter` de Next | `[x]` |
| `frontend/src/components/ProtectedRoute.jsx` | `components/ProtectedRoute.jsx` | `'use client'`, reescrito con `useRouter` de Next | `[x]` |
| `frontend/src/components/SearchHistory.jsx` | `components/SearchHistory.jsx` | `'use client'` | `[x]` |
| `frontend/src/components/SectorInput.jsx` | `components/SectorInput.jsx` | `'use client'` | `[x]` |
| `frontend/src/components/TitoModal.jsx` | `components/TitoModal.jsx` | `'use client'` | `[x]` |

## Contexts / Hooks / Services cliente

| Origen | Destino | Notas | Estado |
| --- | --- | --- | --- |
| `frontend/src/contexts/AuthContext.jsx` | `contexts/AuthContext.jsx` | `'use client'`, localStorage guarded por `typeof window !== 'undefined'` | `[x]` |
| `frontend/src/contexts/VideoContext.jsx` | `contexts/VideoContext.jsx` | `'use client'` | `[x]` |
| `frontend/src/hooks/useTitoModal.js` | `hooks/useTitoModal.js` | `'use client'` | `[x]` |
| `frontend/src/services/api.js` | `services/api.js` | `getApiBaseUrl()` → string vacío (rutas relativas) | `[x]` |

## Adaptaciones especiales

| Tema | Cambio | Estado |
| --- | --- | --- |
| SSE en `/api/user/search` | `ReadableStream` + `text/event-stream`, callbacks `onIncidentFound`/`onProgress` invocan `controller.enqueue` | `[x]` |
| Puppeteer | helper `lib/puppeteer.js` + `puppeteer-core` + `@sparticuz/chromium` (vía `process.env.VERCEL`) | `[x]` |
| `maxDuration` y `runtime` | rutas `test/scrape`, `mobility/{sector,general}`, `user/search`: `export const runtime='nodejs'; export const maxDuration=60` | `[x]` |
| PWA | `@ducanh2912/next-pwa` integrado en `next.config.mjs`, manifest en `public/site.webmanifest` | `[x]` |
| Leaflet | `AnimatedMap` y `LocationMap` importados vía `dynamic({ ssr:false })` desde cada página consumidora | `[x]` |
| `logCapture.js` escritura a disco | condicionada con flag `IS_SERVERLESS` (`process.env.VERCEL` o `AWS_LAMBDA_FUNCTION_NAME`) | `[x]` |
| `ProtectedRoute` | reescrito con `useRouter` de `next/navigation` + `useEffect` | `[x]` |
| React Router → Next | reemplazado `Link`, `useNavigate`, `useLocation`, `useSearchParams` por equivalentes de Next | `[x]` |
| DB pool singleton | `globalThis.__SEG_MOV_PG_POOL__` para sobrevivir hot reload, `ensureDatabaseInitialized()` idempotente | `[x]` |
| `dotenv.config()` | eliminado en `lib/db/db.js`, `emailService`, `geocodingService`, `twitterService` | `[x]` |
| `localStorage` en SSR | guarded con `typeof window !== 'undefined'` en `AuthContext` y `services/api.js` | `[x]` |

## Variables de entorno

| Variable | Uso | Requerida | Estado |
| --- | --- | --- | --- |
| `DATABASE_URL` | Neon Postgres | sí | `[x]` documentada en `.env.example` |
| `JWT_SECRET` | firma JWT | sí | `[x]` |
| `JWT_EXPIRES_IN` | expiración JWT (default 7d) | no | `[x]` |
| `TWITTER_BEARER_TOKEN` | Twitter API v2 | sí (para datos reales) | `[x]` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | Email | no (degrade graceful) | `[x]` |
| `FRONTEND_URL` | links en emails | sí (en prod) | `[x]` |
| `ALLOWED_ORIGINS` | CORS extra | no | `[x]` |
| `NODE_ENV` | `production` en Vercel | auto | `[x]` |
| `VERCEL` | flag de runtime | auto | `[x]` |
| `NEXT_PUBLIC_API_URL` | override opcional de baseURL cliente (default vacío) | no | `[x]` |

## Checklist de validación final

### Local (completado)

- `[x]` `npm install` raíz limpio (sin warnings críticos)
- `[x]` `npm run build` exitoso (34 rutas compiladas)
- `[x]` `npm run dev` arranca en `http://localhost:4051`
- `[x]` `GET /` (HomePage) responde `200` (SSR ok, sin errores de hidratación)
- `[x]` `GET /login` responde `200` (sin errores SSR)
- `[x]` `GET /api/health` responde `200 {"status":"ok"}`
- `[x]` `GET /api/auth/me` responde con error controlado cuando falta `DATABASE_URL` (handler ejecuta correctamente)

### Pendientes con DB real (requieren `DATABASE_URL` en `.env.local`)

- `[ ]` Login funcional (`POST /api/auth/login`)
- `[ ]` Búsqueda por sector con SSE (`POST /api/user/search`)
- `[ ]` Admin dashboard carga datos
- `[ ]` Notificaciones admin
- `[ ]` Scraping de prueba (`POST /api/test/scrape`) — local
- `[ ]` Mapas Leaflet (Dashboard, Buscar, Admin, TestScraping) sin errores SSR
- `[ ]` PWA instalable (solo en `npm run build && npm start`, deshabilitada en dev)

### Deploy Vercel

- `[ ]` Importar repo en Vercel (Next.js detectado automáticamente)
- `[ ]` Configurar Env Vars (Production + Preview):
  - `DATABASE_URL` (Neon Postgres connection string)
  - `JWT_SECRET` (cadena aleatoria larga)
  - `JWT_EXPIRES_IN` (opcional, default `7d`)
  - `TWITTER_BEARER_TOKEN`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - `FRONTEND_URL` (https://<deploy>.vercel.app)
- `[ ]` Verificar runtime Node.js en rutas con `puppeteer-core` (`/api/test/scrape`, `/api/mobility/{sector,general}`)
- `[ ]` Verificar `maxDuration=60` aplicado
- `[ ]` Validar logs en dashboard Vercel (sin escritura a disco; `logCapture` salta archivo cuando `process.env.VERCEL`)
- `[ ]` Smoke test endpoints críticos contra deploy preview
- `[ ]` Probar PWA install (manifest + service worker registrados)
