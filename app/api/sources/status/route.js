import { NextResponse } from 'next/server';
import { WAZE_ENABLED } from '@/lib/services/wazeService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/sources/status
 *
 * Devuelve el estado runtime de cada fuente / feature del sistema.
 * Lo consume la home (`/`) para mostrar badges de "operativa / requiere config /
 * en desarrollo / no disponible" sin tener que cambiar el front al cambiar
 * variables de entorno o flags.
 *
 * Status posibles:
 *   - "operational": la fuente está activa y se consulta en cada búsqueda.
 *   - "configuration_required": existe pero le falta una variable de entorno.
 *   - "in_development": migración pendiente o selectores rotos.
 *   - "unavailable": se intenta pero falla sistemáticamente (Cloudflare, etc.).
 *   - "disabled": deshabilitada conscientemente.
 */
export async function GET() {
  const hasTwitterToken = !!process.env.TWITTER_BEARER_TOKEN;
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
  const hasGoogleMaps = !!process.env.GOOGLE_MAPS_API_KEY;
  const isVercel = !!process.env.VERCEL;

  const sources = [
    {
      id: 'bogota-news',
      name: 'bogota.gov.co (blogposts)',
      description: 'Actualizaciones oficiales de movilidad publicadas en la página de la Alcaldía',
      icon: '📰',
      status: 'operational',
      label: 'Operativa',
      color: 'green',
      detail: 'Scraping con cheerio + validación con IA',
    },
    {
      id: 'twitter',
      name: 'Twitter API v2',
      description: '@SectorMovilidad · @BogotaTransito · @TransMilenio',
      icon: '🐦',
      status: hasTwitterToken ? 'operational' : 'configuration_required',
      label: hasTwitterToken ? 'Operativa' : 'Requiere Bearer Token',
      color: hasTwitterToken ? 'green' : 'yellow',
      detail: hasTwitterToken
        ? 'Bearer Token configurado'
        : 'Configurar TWITTER_BEARER_TOKEN en variables de entorno',
    },
    {
      id: 'nitter',
      name: 'Twitter (scraping vía Nitter)',
      description: 'Fallback cuando la API oficial no está disponible',
      icon: '🔍',
      status: 'unavailable',
      label: 'No disponible',
      color: 'red',
      detail: 'Bloqueado por Cloudflare CAPTCHA en todas las instancias públicas',
    },
    {
      id: 'waze',
      name: 'Waze Live Map',
      description: 'Incidentes de tráfico crowdsourced en tiempo real',
      icon: '🗺️',
      status: WAZE_ENABLED ? 'operational' : 'in_development',
      label: WAZE_ENABLED ? 'Operativa' : 'En desarrollo',
      color: WAZE_ENABLED ? 'green' : 'red',
      detail: WAZE_ENABLED
        ? 'Selectores actualizados'
        : 'Selectores de Waze obsoletos · pendiente API partner o nuevo scraper',
    },
  ];

  const features = [
    {
      id: 'search-sse',
      name: 'Búsqueda con streaming SSE',
      icon: '⚡',
      status: 'operational',
      label: 'Operativa',
      color: 'green',
      detail: 'Stream nativo con ReadableStream',
    },
    {
      id: 'geocoding',
      name: 'Geocodificación de direcciones',
      icon: '📍',
      status: 'operational',
      label: hasGoogleMaps ? 'Operativa (Google Maps)' : 'Operativa (Nominatim)',
      color: 'green',
      detail: hasGoogleMaps
        ? 'Google Maps API configurada'
        : 'Usando Nominatim (gratis). Para mejor precisión, configura GOOGLE_MAPS_API_KEY',
    },
    {
      id: 'ai-validation',
      name: 'Validación de relevancia con IA',
      icon: '🤖',
      status: hasDeepSeek ? 'operational' : 'configuration_required',
      label: hasDeepSeek ? 'Operativa' : 'Requiere API key',
      color: hasDeepSeek ? 'green' : 'yellow',
      detail: hasDeepSeek
        ? 'DeepSeek configurado'
        : 'Configurar DEEPSEEK_API_KEY para validación automática de blogposts',
    },
    {
      id: 'maps',
      name: 'Mapa interactivo (Leaflet)',
      icon: '🗺️',
      status: 'operational',
      label: 'Operativa',
      color: 'green',
      detail: 'OpenStreetMap + react-leaflet con SSR desactivado',
    },
    {
      id: 'pwa',
      name: 'PWA instalable',
      icon: '📱',
      status: 'operational',
      label: 'Operativa',
      color: 'green',
      detail: '@ducanh2912/next-pwa',
    },
    {
      id: 'emails',
      name: 'Notificaciones por email',
      icon: '✉️',
      status: hasSmtp ? 'operational' : 'configuration_required',
      label: hasSmtp ? 'Operativa' : 'Modo desarrollo (ethereal)',
      color: hasSmtp ? 'green' : 'yellow',
      detail: hasSmtp
        ? 'SMTP configurado'
        : 'Configurar SMTP_HOST/USER/PASS para envío real. En dev usa ethereal.email',
    },
    {
      id: 'cron',
      name: 'Refresh automático de cache',
      icon: '⏰',
      status: isVercel ? 'in_development' : 'operational',
      label: isVercel ? 'En desarrollo (Vercel)' : 'Operativa (local)',
      color: isVercel ? 'red' : 'green',
      detail: isVercel
        ? 'node-cron no funciona en serverless · pendiente migrar a Vercel Cron Jobs'
        : 'node-cron activo en proceso local',
    },
  ];

  return NextResponse.json({
    sources,
    features,
    environment: {
      isVercel,
      runtime: 'nodejs',
    },
    timestamp: new Date().toISOString(),
  });
}
