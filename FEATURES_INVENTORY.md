# Inventario de Funciones - Transito Tito

> Estado: v2.2.0 (post-migración Next.js + Vercel Cron + cache admin)
> Última actualización: 2026-05-12
>
> Este documento mantiene el control completo de **endpoints, servicios, páginas, módulos y dependencias**
> del proyecto unificado en Next.js. Incluye matriz de compatibilidad con **Vercel** y **Next.js App Router**
> y marca claramente qué funciones quedaron pendientes de validación / corrección tras la migración desde
> el stack original (Express + Vite + React Router).

---

## 1. Estado general

| Capa | Origen previo | Estado actual | Soporte Vercel |
| ---- | ------------- | ------------- | -------------- |
| Backend API | Express 4 (puerto 3051) | Migrado a Route Handlers (`app/api/*/route.js`) | Funciona como **Serverless Functions** (`runtime = nodejs`) |
| Frontend SPA | Vite + React Router | Migrado a App Router (`app/**`) | Funciona como **edge + serverless render** |
| Auth | Middleware Express + JWT | Helpers `lib/middleware/auth.js` que devuelven `NextResponse` | OK (cookies/headers funcionan) |
| Base de datos | `pg` Pool global Express | Singleton `globalThis[POOL_KEY]` para HMR | OK con Neon/Postgres serverless |
| Scraping | `puppeteer` local | `puppeteer-core` + `@sparticuz/chromium` (Vercel) | Parcial - ver §5 |
| SSE streaming | Express `res.write` | `ReadableStream` en Route Handler | OK con `runtime = nodejs` |
| PWA | `vite-plugin-pwa` | `@ducanh2912/next-pwa` | OK |
| Cron jobs | `node-cron` en server.js | Pendiente migrar a `vercel cron` | NO se ejecuta en Vercel actualmente |

---

## 2. Endpoints (Route Handlers) - 31 endpoints

### 2.1 Autenticación / Cuenta (`app/api/auth/*`)

| Endpoint | Método | Origen Express | Estado | Soporte Vercel |
| -------- | ------ | -------------- | ------ | -------------- |
| `/api/auth/login` | POST | `backend/routes/auth.js#login` | OK | OK |
| `/api/auth/register` | POST | `backend/routes/auth.js#register` | OK (envía email + notifica admins) | OK |
| `/api/auth/me` | GET | `backend/routes/auth.js#me` | OK | OK |
| `/api/auth/logout` | POST | `backend/routes/auth.js#logout` | OK (registra actividad `logout`) | OK |
| `/api/auth/app-open` | POST | `backend/routes/auth.js#appOpen` | OK (registra actividad `app_open`) | OK |

### 2.2 Movilidad / Búsqueda (`app/api/mobility/*`, `app/api/user/search`)

| Endpoint | Método | Origen Express | Estado | Soporte Vercel |
| -------- | ------ | -------------- | ------ | -------------- |
| `/api/user/search` | POST (SSE) | `backend/routes/user.js#search` | OK (stream con `ReadableStream`) | OK - **requiere `runtime = 'nodejs'` y `maxDuration` >=60s en plan Pro** |
| `/api/user/searches` | GET | `backend/routes/user.js#listSearches` | OK | OK |
| `/api/user/searches/[id]/results` | GET | `backend/routes/user.js#getSearchResults` | OK | OK |
| `/api/mobility/sector` | GET | `backend/routes/mobility.js#sector` | OK (pública con cache) | OK |
| `/api/mobility/general` | GET | `backend/routes/mobility.js#general` | OK (cache 1h) | OK |
| `/api/mobility/refresh` | POST | nuevo en migración | OK | OK |

### 2.3 Administración (`app/api/admin/*`)

| Endpoint | Método | Origen Express | Estado | Soporte Vercel |
| -------- | ------ | -------------- | ------ | -------------- |
| `/api/admin/users` | GET | `backend/routes/admin.js#getUsers` | OK (GROUP BY corregido v2.1.0) | OK |
| `/api/admin/users/[id]` | PUT/DELETE | `backend/routes/admin.js#updateUser` | OK | OK |
| `/api/admin/users/[id]/approve` | PUT | `backend/routes/admin.js#approveUser` | OK (envía email) | OK |
| `/api/admin/sources` | GET/POST | `backend/routes/admin.js#sources` | OK | OK |
| `/api/admin/sources/[id]` | PUT/DELETE | igual | OK | OK |
| `/api/admin/tags` | GET/POST | `backend/routes/admin.js#tags` | OK | OK |
| `/api/admin/config` | GET | `backend/routes/admin.js#config` | OK | OK |
| `/api/admin/config/[key]` | PUT | `backend/routes/admin.js#setConfig` | OK | OK |
| `/api/admin/api-status` | GET | `backend/routes/admin.js#apiStatus` | OK | OK |
| `/api/admin/analytics/stats` | GET | `backend/routes/admin.js#analyticsStats` | OK (corregido GROUP BY v2.1.0) | OK |
| `/api/admin/activities` | GET | `backend/routes/admin.js#activities` | OK | OK |
| `/api/admin/searches/[id]/results` | GET | `backend/routes/admin.js#searchResults` | OK | OK |
| `/api/admin/notifications` | GET | `backend/routes/admin.js#notifications` | OK | OK |
| `/api/admin/notifications/count` | GET | igual | OK | OK |
| `/api/admin/notifications/[id]/read` | PUT | igual | OK | OK |
| `/api/admin/notifications/read-all` | PUT | igual | OK | OK |
| `/api/admin/cache` | GET/DELETE | nuevo en v2.2.0 — gestión de cache | OK |

### 2.4 Health & Utilities

| Endpoint | Método | Estado | Soporte Vercel |
| -------- | ------ | ------ | -------------- |
| `/api/health` | GET | OK | OK |
| `/api/test/scrape` | POST | OK (panel debug) | OK |
| `/api/sources/status` | GET | OK (v2.1.1) — devuelve estado runtime de fuentes y features | OK |
| `/api/cron/refresh-cache` | GET | OK (v2.2.0) — refresh automático de cache via Vercel Cron | OK (requiere `CRON_SECRET`) |

---

## 3. Páginas (App Router) - 8 páginas

| Ruta | Archivo | Origen Vite | Estado | Notas |
| ---- | ------- | ----------- | ------ | ----- |
| `/` | `app/(main)/page.jsx` | `frontend/src/pages/HomePage.jsx` | OK | Sección "Otros" con cards estandarizadas + modal `IncidentCard` (fix v2.1.0) |
| `/buscar` | `app/(main)/buscar/page.jsx` | `frontend/src/pages/SectorSearch.jsx` | OK | SSE + mapa con `AnimatedMap`. **Mapa arreglado en v2.1.0** (altura del contenedor) |
| `/dashboard` | `app/(main)/dashboard/page.jsx` | `frontend/src/pages/DashboardPage.jsx` | OK | Historial + filtros |
| `/admin` | `app/(main)/admin/page.jsx` | `frontend/src/pages/AdminDashboardPage.jsx` | OK | Fix `useNavigate` en `UsersList` (v2.1.0) |
| `/login` | `app/login/page.jsx` | `frontend/src/pages/LoginPage.jsx` | OK | |
| `/pending-approval` | `app/pending-approval/page.jsx` | `frontend/src/pages/PendingApprovalPage.jsx` | OK | Rediseñado como modal compacto (v2.1.0) |
| `/account-activated` | `app/account-activated/page.jsx` | `frontend/src/pages/AccountActivatedPage.jsx` | OK | |
| `/test-scraping` | `app/(main)/test-scraping/page.jsx` | nuevo (debug) | OK | Solo admin |

---

## 4. Servicios de dominio (`lib/services/*`)

| Archivo | Responsabilidad | Estado | Notas |
| ------- | --------------- | ------ | ----- |
| `mobilityService.js` | Orquesta consulta multi-fuente | OK | Fix scoping `coordinates/debugInfo/allIncidents` (v2.1.0) |
| `scrapingService.js` | Scraping bogota.gov.co (cheerio) | OK | **v2.1.0:** `timestamp` ahora usa la fecha real de publicación del blogpost, no la del scraping |
| `twitterService.js` | Twitter API v2 oficial | OK | Requiere `TWITTER_BEARER_TOKEN` |
| `twitterScrapingService.js` | Scraping nitter (fallback) | DEGRADADO | Cloudflare CAPTCHA bloquea (mismo problema que v1.x) |
| `wazeService.js` | Waze live map (Puppeteer) | DEGRADADO | Selectores antiguos, retorna 0 incidentes |
| `nlpService.js` | NLP (compromise) para extraer ubicaciones | OK | |
| `geocodingService.js` | Geocoding (Nominatim / Google) | OK | Sin clave usa Nominatim (gratis) |
| `aiValidationService.js` | Validación de relevancia con DeepSeek | OK | Requiere `DEEPSEEK_API_KEY` |
| `emailService.js` | Envío de emails (nodemailer) | OK | Usa SMTP env o ethereal en dev |
| `authService.js` | Hash / verify passwords + JWT | OK | |
| `sourcesService.js` | Gestión fuentes / tags | OK | |
| `configService.js` | Config dinámica desde DB | OK | |

---

## 5. Matriz de soporte Vercel / Next.js

> Identifica qué funciones del stack actual son compatibles con el plan **gratis (Hobby)** y **Pro**
> de Vercel, y cuáles requieren consideración especial.

### 5.1 Plenamente soportado

| Función | Hobby | Pro | Notas |
| ------- | ----- | --- | ----- |
| Route Handlers (REST) | OK | OK | `runtime = 'nodejs'` |
| SSR / RSC | OK | OK | |
| Streaming / SSE con `ReadableStream` | OK | OK | Respeta timeout: 10s Hobby, 60s Pro, 900s Enterprise |
| `pg` (PostgreSQL Neon) | OK | OK | Usa `globalThis` para no agotar pool |
| `nodemailer` | OK | OK | SMTP externo |
| `jsonwebtoken` + `bcrypt` | OK | OK | |
| `cheerio` (parsing HTML) | OK | OK | Sin necesidad de browser |
| `@tanstack/react-query` | OK | OK | |
| `react-leaflet` + `leaflet` | OK | OK | Requiere `next/dynamic({ ssr: false })` - **ya aplicado** |
| `chart.js` + `react-chartjs-2` | OK | OK | |
| PWA con `@ducanh2912/next-pwa` | OK | OK | |
| Image Optimization | OK | OK | Requiere `images.remotePatterns` |

### 5.2 Soportado con caveats

| Función | Hobby | Pro | Caveats |
| ------- | ----- | --- | ------- |
| Puppeteer (`scrapingService` con browser real) | LIMITADO | OK | Requiere `@sparticuz/chromium` (~50 MB). Cold start +5-8 s. Aumentar `maxDuration` |
| SSE para `/api/user/search` | 10 s max | 60 s max | Búsquedas largas (>60s) NO terminan en Hobby. **Considerar Pro o background jobs** |
| `node-cron` | RESUELTO | RESUELTO | **v2.2.0:** reemplazado por Vercel Cron Jobs definidos en `vercel.json` que invocan `/api/cron/refresh-cache` |
| Lectura/escritura de archivos (`logCapture` a `logs/`) | NO | NO | Filesystem es read-only excepto `/tmp`. **Ya condicionado con `!process.env.VERCEL`** |
| Twitter API v2 | OK | OK | Plan Free de Twitter da 100 posts/mes (limitante) |

### 5.3 NO soportado / pendiente migrar

| Función | Estado | Acción requerida |
| ------- | ------ | ---------------- |
| `node-cron` (refresh automático de cache) | NO funciona en Vercel | Migrar a `vercel.json` con `crons` y crear endpoint `/api/cron/refresh` |
| Escritura de logs a `logs/app.log` | NO funciona en Vercel | Usar `/tmp/app.log` o servicio externo (Logflare, Axiom) |
| Twitter scraping vía Nitter | Bloqueado por Cloudflare | Mantener fallback a Twitter API oficial |
| Waze scraping | Selectores obsoletos | Investigar Waze API o eliminar fuente |

---

## 6. Variables de entorno requeridas

| Variable | Obligatoria | Uso |
| -------- | ----------- | --- |
| `DATABASE_URL` | SI | Conexión Postgres (Neon) |
| `JWT_SECRET` | SI | Firma de tokens |
| `TWITTER_BEARER_TOKEN` | NO | Habilita Twitter API v2 |
| `DEEPSEEK_API_KEY` | NO | Habilita validación AI de blogposts |
| `GOOGLE_MAPS_API_KEY` | NO | Geocoding (fallback a Nominatim) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | NO | Envío de emails (sin: ethereal en dev) |
| `FRONTEND_URL` | NO | URL pública para links en emails |
| `BOOTSTRAP_ADMIN_USERNAMES` | NO | Promueve usuarios a admin al arranque (default: `Jho`) |
| `CRON_SECRET` | SI en Vercel | Autentica el cron `/api/cron/refresh-cache`. En local opcional |
| `NEXT_PUBLIC_*` | NO | Cualquier variable expuesta al cliente |

---

## 7. Tareas pendientes (próximas versiones)

### 7.1 Funcionales (alta prioridad)

- [x] **v2.2.0** — Migrar `node-cron` a Vercel Cron (`vercel.json` + `/api/cron/refresh-cache`)
- [x] **v2.1.0** — Mejorar scraping de bogota.gov.co: extraer fecha de publicación del **artículo** (meta tags / `<time>`)
- [x] **v2.2.0** — Invalidar/limpiar `general_mobility_cache` antiguo desde el panel admin
- [ ] Revisar `wazeService`: actualizar selectores o eliminar la fuente del UI (actualmente queda como "en desarrollo" en el panel)
- [ ] Filtro por **localidad/zona** en HomePage para datos generales (filtros UI sobre cache)
- [ ] Notificaciones push de nuevas alertas para usuarios suscritos a una zona

### 7.2 Calidad / UX (media prioridad)

- [x] **v2.2.0** — Loading skeleton consistente entre `/buscar` y `/dashboard`
- [x] **v2.2.0** — Indicador de "datos antiguos" cuando el incidente tiene >24h (badge amarillo) y descarte automático a >7 días
- [x] **v2.2.0** — Diagnóstico de fuentes en `/buscar` (cuántos hits dio cada fuente)
- [ ] Validar accesibilidad WCAG en modales y formularios
- [ ] Modo oscuro (CSS variables ya están preparadas)

### 7.3 Infraestructura (baja prioridad)

- [ ] Logging a servicio externo (Logflare/Axiom)
- [ ] Métricas Web Vitals desde Vercel Analytics
- [ ] Tests E2E (Playwright) sobre rutas críticas (`/buscar`, `/login`)

---

## 8. Referencias rápidas

- Migración completa: `MIGRATION_NEXTJS_PROGRESS.md`
- Historial de cambios: `CHANGELOG.md`
- Documentación de fuentes: `docs/FUENTES_DATOS_MOVILIDAD.md`
- Análisis de probabilidades: `docs/ANALISIS_FUENTES_DATOS_REALES.md`
