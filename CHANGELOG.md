# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **NOTA IMPORTANTE:** A partir de la versión **2.0.0** el proyecto fue migrado a
> **Next.js (App Router)** como monorepo unificado. Las versiones 1.x se ejecutaban
> sobre Express (backend) + Vite/React (frontend) en dos procesos separados.

## [2.2.0] - 2026-05-12

### Agregado

#### Refresh automático en Vercel (reemplazo de node-cron)
- Endpoint `GET /api/cron/refresh-cache` que limpia entradas expiradas y regenera la cache general de movilidad
- Autenticación con `Authorization: Bearer ${CRON_SECRET}` (Vercel inyecta el header automáticamente en cron jobs)
- En entorno local sin `CRON_SECRET` el endpoint queda accesible para pruebas con `curl`; en Vercel exige el secret
- `vercel.json` configurado con cron `0 */6 * * *` (cada 6 horas) y `maxDuration` por endpoint

#### Gestión de cache desde el panel admin
- Endpoint `GET /api/admin/cache` que devuelve resumen por tabla (entradas vigentes vs expiradas)
- Endpoint `DELETE /api/admin/cache` con soporte para:
  - Limpiar solo expiradas (`onlyExpired: true`, default)
  - Forzar limpieza total (`onlyExpired: false`)
  - Apuntar a tablas específicas (`tables: ['general_mobility_cache', ...]`)
- Nueva pestaña **"🧹 Cache"** en `/admin` con UI para inspeccionar y limpiar caches (por tabla o en bloque)

#### Frescura de incidentes
- `mobilityService` ahora **descarta automáticamente** incidentes con timestamp >7 días (configurable vía `FRESHNESS_THRESHOLDS.MAX_AGE_DAYS`)
- Cada incidente queda **anotado** con `freshness: 'fresh' | 'recent' | 'stale' | 'expired' | 'unknown'` y `ageHours`
- `IncidentCard` muestra un **badge** "Posiblemente desactualizado" (amarillo) si tiene >24h o "Antiguo (>7 días)" (rojo) en caso extremo (fallback que también funciona con resultados cacheados pre-v2.2.0)

#### Diagnóstico de fuentes en /buscar
- Componente `SourceStats` muestra, junto al listado de incidentes, cuántos elementos crudos devolvió cada fuente y cuántos fueron relevantes para la búsqueda (`matched / fetched`)
- Cada fuente se acompaña de un pill de estado (operativa / en desarrollo / requiere config)
- `getMobilityBySector` ahora retorna un objeto `sourceStats` con `{ twitter, bogota, waze }` y este se propaga por SSE y JSON

#### Loading skeletons consistentes
- Componente `IncidentSkeletonGrid` (`components/SkeletonCard.jsx`) con shimmer animation
- Aplicado a `/buscar` (durante el streaming SSE) y `/dashboard` (al hacer la primera búsqueda)
- Mantiene el layout estable (sin "salto" cuando llegan los resultados)

### Cambiado
- `addIncident` en `getMobilityBySector` ahora aplica filtro de antigüedad y anota `freshness` antes de empujar al stream
- Endpoint `/api/user/search` SSE: el evento `complete` incluye ahora `sourceStats`
- Versión bumpeada a **2.2.0** (incluye nuevas features sin breaking changes en endpoints existentes)

### Variables de entorno nuevas
- `CRON_SECRET` (opcional en local, obligatoria en Vercel para que `/api/cron/refresh-cache` funcione)
- Ver `.env.example` actualizado

### Notas para deploy en Vercel
1. Generar un `CRON_SECRET` aleatorio: `openssl rand -hex 32`
2. Agregarlo en Vercel → Settings → Environment Variables
3. El cron job se registra automáticamente desde `vercel.json` al hacer deploy
4. En Vercel Hobby los crons solo se ejecutan **una vez al día** independientemente del schedule; en Pro respetan el schedule completo

---

## [2.1.1] - 2026-05-12

### Agregado
- Endpoint `GET /api/sources/status` que devuelve el estado runtime de cada fuente y feature del sistema (operational / configuration_required / in_development / unavailable / disabled)
- Componente `components/SystemStatus.jsx` con badges de color que se consume desde la HomePage
- Sección **"Estado del Sistema"** en la home (`/`) reemplazando la lista estática "Fuentes de Información". Ahora se ve en tiempo real:
  - 🟢 **Operativas:** bogota.gov.co · Twitter API (si hay Bearer Token) · Geocoding · IA validación (si hay DeepSeek key) · Mapa Leaflet · PWA
  - 🟡 **Requieren configuración:** Twitter API sin Bearer Token · Emails sin SMTP · IA sin DeepSeek key
  - 🔴 **En desarrollo / no disponibles:** Waze Live Map · Twitter scraping (Nitter, bloqueado por Cloudflare) · `node-cron` en Vercel
- Resumen visual con conteo de fuentes operativas vs. pendientes en la parte superior del panel

### Cambiado
- La home ya no muestra una lista estática `@SectorMovilidad / @BogotaTransito / @TransMilenio / bogota.gov.co`; ahora muestra el **estado real** detectado por el servidor (variables de entorno, flags, etc.)
- Versión bumpeada a **2.1.1**

### Notas para el usuario
- Las fuentes marcadas en **rojo** o **amarillo** no afectan al funcionamiento del sistema. Las búsquedas siempre se completan con las fuentes que están en verde
- Cuando configures variables de entorno (`TWITTER_BEARER_TOKEN`, `DEEPSEEK_API_KEY`, `SMTP_*`), las features pasarán automáticamente a verde en el panel al recargar
- El badge de `node-cron` aparecerá en rojo cuando la app corra en Vercel hasta que se migre a Vercel Cron Jobs

---

## [2.1.0] - 2026-05-12

### Agregado
- `FEATURES_INVENTORY.md`: inventario completo de endpoints, páginas, servicios y matriz de compatibilidad con Vercel/Next.js
- Documentación de los flags `BOOTSTRAP_ADMIN_USERNAMES` y del script `npm run promote-admin`
- Script `scripts/promote-admin.mjs` para promover usuarios a administrador manualmente desde la línea de comandos
- Promoción automática de usuarios bootstrap (`Jho` por defecto) al arranque para que existan administradores sin intervención manual
- Extracción de fecha de publicación desde meta tags (`article:published_time`, `pubdate`, `DC.date.issued`, `<time datetime>`) en `extractNewsFromHTML` cuando no se recibe `blogpostDate`

### Corregido
- **Scraping de fechas**: los reportes de `bogota.gov.co` ahora utilizan la **fecha real del artículo** (parseada desde el listado o desde meta tags) en lugar de `new Date().toISOString()` al momento del scraping. Esto evita que noticias antiguas aparezcan como "hace 5 horas"
- **Mapa que no renderizaba en `/buscar`**: el contenedor `.results-map-section` no tenía altura definida, provocando que el `MapContainer` de Leaflet colapsara a 0px. Se agregó `min-height` y reglas explícitas para `.location-map-container` dentro del split layout
- `coordinates is not defined` en `lib/services/mobilityService.js`: se movieron las declaraciones (`debugInfo`, `coordinates`, `allIncidents`) al ámbito superior de `getMobilityBySector` para que sean accesibles desde el `catch` exterior
- `useNavigate is not defined` en `UsersList` del panel admin: se eliminó la importación residual de `react-router-dom` (la navegación ya se hace por props con `useRouter` de Next)
- Error 500 en `/api/admin/analytics/stats`: la consulta `by_user` en `lib/db/activities.js` no incluía `u.username` y `u.email` en la cláusula `GROUP BY` (PostgreSQL estricto)
- CSS de `.api-stats-grid` malformado que rompía el build de `styles/AdminDashboardPage.css`
- Warning de Next sobre `themeColor` en `metadata`: movido a la exportación `viewport`
- Warning de Next sobre workspace root: agregado `outputFileTracingRoot` en `next.config.mjs`

### Cambiado
- `IncidentCard` (cards de la sección "Otros" en HomePage) refactorizada con:
  - Altura mínima estandarizada (`260px`) para todas las tarjetas
  - Truncado de título (80 chars) y descripción (180 chars)
  - Botón "Leer más" y modal de detalle con contenido completo + link al original
  - Mejor formato de fechas (relativo solo para incidentes <24h, absoluto para los más antiguos)
- `PendingApprovalPage` rediseñada como **modal compacto** consistente con `ConfirmModal`, en lugar de pantalla completa con scrollbar
- Versión bumpeada a **2.1.0** en `package.json`

### Documentación
- `README.md`: actualizado con instrucciones de `BOOTSTRAP_ADMIN_USERNAMES` y `npm run promote-admin`

---

## [2.0.0] - 2026-05-11 - Migración a Next.js (App Router)

> Versión mayor que unifica frontend y backend en un único proyecto Next.js
> desplegable como una sola aplicación en Vercel.

### Agregado
- **Monorepo Next.js**: un único `package.json` raíz con todas las dependencias del proyecto
- **App Router** con rutas `app/(main)/*`, `app/login`, `app/pending-approval`, `app/account-activated`
- **Route Handlers** (`app/api/**/route.js`) que reemplazan los `backend/routes/*` de Express:
  - 5 endpoints de autenticación (`/api/auth/*`)
  - 6 endpoints de movilidad (`/api/mobility/*`, `/api/user/search*`)
  - 18 endpoints de administración (`/api/admin/*`)
  - 2 utilitarios (`/api/health`, `/api/test/scrape`)
- **Helper de Puppeteer** (`lib/puppeteer.js`) que carga `puppeteer` localmente o `puppeteer-core` + `@sparticuz/chromium` en Vercel
- **Streaming SSE** del endpoint `/api/user/search` reimplementado con `ReadableStream` nativo de Web APIs (en lugar de `res.write` de Express)
- **PWA** vía `@ducanh2912/next-pwa` con manifest, iconos y service worker generados automáticamente
- **Singleton de DB** (`lib/db/db.js`) que usa `globalThis[POOL_KEY]` para sobrevivir hot-reloads de Next y compartir `pg.Pool` entre invocaciones serverless
- **Auth helpers** (`lib/middleware/auth.js`): `requireAuth`, `requireAdmin` que devuelven `NextResponse` para usar en cualquier Route Handler
- **`logCapture.js`** condicionado: deshabilita escritura a disco cuando `process.env.VERCEL` está presente; usa `globalThis` para preservar buffer en memoria entre HMR
- `next.config.mjs` con `serverExternalPackages` (puppeteer, sparticuz, cheerio), `images.remotePatterns`, PWA config
- `jsconfig.json` con alias `@/*`
- `.env.example` unificado para front + back
- `.eslintrc.json` con `next/core-web-vitals`
- Migración de **todas las páginas** desde React Router a `next/link`, `useRouter`, `usePathname`, `useSearchParams`
- Dynamic imports con `ssr: false` para componentes Leaflet (`AnimatedMap`, `LocationMap`)
- Guardas `typeof window !== 'undefined'` para todos los accesos a `localStorage` desde Client Components
- `MIGRATION_NEXTJS_PROGRESS.md`: documento de progreso de migración con checklist de tareas

### Cambiado
- **Backend Express eliminado**: el código de `backend/` fue archivado y los servicios migrados a `lib/services/*` y `lib/db/*`
- **Frontend Vite eliminado**: el código de `frontend/` fue archivado y los componentes migrados a `components/*` y páginas a `app/**`
- **CORS** ya no es necesario al estar todo en el mismo origen
- **Variables de entorno** consolidadas: Next.js carga `.env` y `.env.local` nativamente; se eliminó `dotenv.config()` manual
- Scripts npm:
  - `npm run dev` -> `next dev -p 4051`
  - `npm run build` -> `next build`
  - `npm run start` -> `next start -p 4051`
- Versión bumpeada a **2.0.0** (breaking change: cambio completo de stack)

### Eliminado
- `backend/server.js`, `backend/routes/*`, `backend/middleware/auth.js` (migrados)
- `frontend/vite.config.js`, `frontend/src/main.jsx`, `frontend/index.html` (reemplazados por App Router)
- `react-router-dom` (reemplazado por `next/navigation`)
- `cors` (innecesario)
- `dotenv` explícito en código (Next.js lo carga nativamente)
- Configuración de port forwarding y detección de URLs públicas de Cursor (innecesario con monorepo)

### Notas de despliegue
- Para **Vercel** se requiere:
  - `runtime = 'nodejs'` en handlers que usan Puppeteer o módulos nativos
  - `maxDuration` ajustado en handlers que ejecutan scraping
  - Variables de entorno configuradas en el dashboard (ver `FEATURES_INVENTORY.md` §6)
- **`node-cron` NO se ejecuta en Vercel** - pendiente migrar a Vercel Cron Jobs (ver `FEATURES_INVENTORY.md` §7.1)

---

## [1.3.0] - 2025-11-03

### Agregado
- Sistema de prevención de repetición de videos: el video del hero y el del modal siempre son diferentes
- 6 nuevos mensajes de bienvenida más personales y emocionantes que reflejan la personalidad de Tito
- Mensajes que hablan de emociones, hacer sentir especial al usuario, descubrir juntos, y ayuda mutua
- Resaltado verde claro con border-radius de 25px para el mensaje de "no hay problemas de movilidad"

### Cambiado
- **Cambio de nombre del proyecto**: De "Seguimiento Movilidad" a "Transito Tito" con subtítulo "Seguimiento a la movilidad"
- El subtítulo "Seguimiento a la movilidad" ahora aparece a la derecha del título en el header (reduciendo la altura del header)
- Título del hero section revertido a "🚦 Seguimiento de Movilidad en Bogotá" con subtítulo descriptivo
- Mejora en la distribución de la sección "no hay problemas": título y subtítulo ahora están en la columna izquierda
- Corrección del color del texto del botón "Iniciar Sesión" a blanco con padding ajustado
- Sistema de mensajes de bienvenida ahora incluye más variedad (6 mensajes diferentes)

### Corregido
- Error de referencia: `data` ahora se declara antes de ser usado en los `useEffect`
- Pausa automática de videos de fondo cuando hay un modal activo (hero y no-results)
- Videos del hero y del modal ahora garantizan ser diferentes para evitar repetición

### Mejorado
- Layout del header más compacto con subtítulo horizontal
- Experiencia de usuario mejorada con mensajes más personales y emocionantes de Tito
- Mejor distribución visual en la sección de "no hay problemas" con dos columnas bien equilibradas

## [1.2.0] - 2025-11-03

### Agregado
- Sistema de cache general de problemas de movilidad en Bogotá
- Tabla `general_mobility_cache` en la base de datos para almacenar resultados generales
- Endpoint `/api/mobility/general` para obtener problemas generales de movilidad
- Problemas generales de movilidad en la página principal (HomePage) con máximo 12 incidentes más relevantes
- Filtrado inteligente de tweets para mostrar solo incidentes relevantes (excluye respuestas simples, consultas, etc.)
- Sistema de priorización de incidentes basado en tipo, ubicación, fuente y recencia
- Integración completa de videos de "Transito - Tito" (mascota de la aplicación)
- Componente `TitoModal` con videos aleatorios y mensajes personalizados
- Hook `useTitoModal` para gestionar modals de Tito con mensajes de movilidad
- Modal de bienvenida con videos aleatorios de Tito saludando
- Modal de búsqueda con videos aleatorios de Tito buscando
- Video de Tito en el hero section de HomePage (lado derecho)
- Layout dividido en SectorSearch: video de Tito (izquierda) y buscador (derecha)
- Video de "camino libre" de Tito cuando no hay problemas de movilidad reportados
- Controles de video con sonido habilitado por defecto y botón mute siempre visible
- Función `getAllRecentTweets()` para obtener todos los tweets sin filtrar por sector
- Función `getGeneralMobilityProblems()` para obtener problemas generales de movilidad

### Cambiado
- Los modals ahora actúan como pre-mensajes de bienvenida: el botón X ejecuta la misma acción que el botón de confirmar
- Filtrado de incidentes mejorado: solo muestra los 12 más importantes y relevantes
- Clasificación de incidentes mejorada para excluir tweets no relevantes (respuestas, consultas, etc.)
- Sistema de priorización de incidentes: manifestación > accidente > desvío > obra
- Videos de Tito se reproducen con sonido habilitado por defecto (con fallback si el navegador lo bloquea)
- Botón mute/unmute siempre visible en la esquina superior izquierda de todos los videos

### Mejorado
- Experiencia de usuario más dinámica e interactiva con videos de Tito
- Filtrado de contenido más inteligente para mostrar solo información relevante
- Visualización de problemas generales más clara y organizada
- Interfaz más atractiva con la mascota Transito - Tito

## [1.1.0] - 2025-11-02

### Agregado
- Configuración de port forwarding con Cursor para acceso público
- Detección automática de URLs públicas del backend cuando se accede desde `devtunnels.ms`
- Configuración de CORS para permitir URLs públicas de Cursor (`devtunnels.ms` y `tunnels.cursor.com`)
- Protección de rutas de búsqueda que requieren autenticación
- Guardado automático de búsquedas asociadas al perfil del usuario
- Barra sticky en el bottom con información de la aplicación y versión
- Versión visible en el header de la aplicación
- Versión visible en la página de login debajo del título
- Link a GitHub del desarrollador (@Jhogarcia111) en la barra sticky

### Cambiado
- Botón "Buscar por Sector" ahora redirige al login si el usuario no está autenticado
- Ruta `/buscar` ahora requiere autenticación para acceder
- Búsquedas ahora usan la API autenticada `/api/user/search` en lugar de la API pública
- Frontend detecta automáticamente si está en URL pública y usa la URL pública del backend
- Configuración de PWA mejorada para permitir instalación en navegadores

### Eliminado
- Label de credenciales por defecto (admin/admin123) del formulario de login
- Archivos temporales y scripts de desarrollo que ya no son necesarios (movidos a carpeta `cleaning/`)

### Corregido
- Error `toFixed is not a function` en `SearchHistory` al convertir coordenadas a números
- Manejo de coordenadas en componentes de búsqueda para evitar errores de tipo
- Overflow horizontal en dispositivos móviles que causaba scroll horizontal no deseado
- Botones y contenido cortados en móviles ajustados al ancho de la pantalla
- Fechas de creación de features en Project Tracker corregidas a octubre-noviembre 2025
- Tildes correctas en nombres y descripciones de features

### Mejorado
- Organización del proyecto: archivos temporales movidos a carpeta `cleaning/`
- Estructura del proyecto más limpia y fácil de navegar
- Documentación de limpieza en `cleaning/README.md` y `cleaning/ANALISIS_LIMPIEZA.md`

## [1.0.0] - 2025-10-31 - Versión Inicial

### Agregado
- Frontend PWA con React y Vite
- Backend API con Express y MySQL/MariaDB
- Sistema de autenticación con JWT
- Búsqueda de problemas de movilidad por sector
- Integración con Twitter API para obtener información en tiempo real
- Integración con servicios de geocodificación
- Sistema de cache para incidentes y búsquedas
- Dashboard para usuarios autenticados
- Panel de administración
- Historial de búsquedas por usuario
- Sistema de tags y fuentes de información

---

## Notas Adicionales

### Fechas Corregidas en Project Tracker
- Todas las features ahora tienen fechas de creación correctas basadas en las fechas reales de los archivos del proyecto (octubre-noviembre 2025)
- Eliminadas todas las fechas "No definida" en el Project Tracker
- Corregidas todas las fechas incorrectas que mostraban enero 2025

### Organización del Proyecto
- Carpeta `cleaning/` creada para almacenar archivos temporales, guías resueltas y scripts que ya no son necesarios
- Estructura del proyecto optimizada con solo archivos esenciales en la raíz
- Documentación de limpieza disponible en `cleaning/ANALISIS_LIMPIEZA.md`

---

[2.2.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/compare/v2.1.1...v2.2.0
[2.1.1]: https://github.com/Jhogarcia111/seguimiento-movilidad/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/compare/v1.3.0...v2.0.0
[1.3.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Jhogarcia111/seguimiento-movilidad/releases/tag/v1.0.0

