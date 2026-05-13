import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Fuentes HTTP públicas verificadas (sin API keys) con avisos de movilidad en Bogotá.
 *
 * Integradas:
 * - RSS Secretaría Distrital de Movilidad: https://www.movilidadbogota.gov.co/rss.xml
 * - Listado en inicio SDM (tarjetas .card-noticia) por si el RSS va desfasado
 * - RSS Bogotá de El Tiempo, filtrado por palabras clave de tránsito / TM / cierres
 *
 * Evaluadas y NO integradas (sin canal HTTP estable para scraping server-side):
 * - Facebook / Instagram / TikTok de clubes de motos, gremios de taxi o cuentas ciudadanas:
 *   contenido tras login, Graph API con token, o muros anti-bot.
 * - TransMilenio sitio institucional: respuestas 403 frecuentes desde IPs de datacenter.
 * - Nitter / X sin Bearer: ya descartado en twitterScrapingService.
 *
 * ArcGIS "Incidentes en vía" (datos abiertos) apunta a FeatureServer en Azure; la conectividad
 * desde entornos serverless es inconsistente — si se estabiliza, conviene consumirlo vía
 * query REST oficial en lugar de scraping HTML.
 */

const AXIOS_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-CO,es;q=0.9',
};

const SDM_RSS = 'https://www.movilidadbogota.gov.co/rss.xml';
const SDM_HOME = 'https://www.movilidadbogota.gov.co/';
const EL_TIEMPO_BOGOTA_RSS = 'https://www.eltiempo.com/rss/bogota.xml';

const MAX_AGE_MS = 72 * 60 * 60 * 1000;
const REQUEST_MS = 18000;

/** Palabras clave para incluir ítems del RSS general de Bogotá (evita política, deportes, etc.) */
const EL_TIEMPO_MOBILITY_RE =
  /transmilenio|tr[áa]nsito|transito|movilidad|v[ií]a\s|vial|cierre|cerrad[ao]|desv[ií]o|desvio|manifestaci|protesta|marcha|accidente|choque|colisi|congesti|peatonal|carril|autopista|avenida calle|calle\s\d|carrera\s\d|nqs|autonorte|sector\s?movilidad|bogot[áa]\s*transito/i;

function stripTags(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDatetimeFromSnippet(html) {
  if (!html) return null;
  const m = String(html).match(/datetime="([^"]+)"/i);
  if (!m) return null;
  const d = new Date(m[1]);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseRfc2822OrIsoDate(s) {
  if (!s) return null;
  const d = new Date(s.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function slugId(prefix, url) {
  try {
    const u = new URL(url);
    const slug = u.pathname.replace(/\/+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
    return `${prefix}-${slug || 'item'}`;
  } catch {
    return `${prefix}-${Buffer.from(String(url)).toString('base64url').slice(0, 24)}`;
  }
}

function newsKey(n) {
  const u = (n.url || '').replace(/^https?:\/\/(www\.)?/i, '').toLowerCase();
  if (u) return `u:${u}`;
  return `t:${(n.title || '').slice(0, 120).toLowerCase()}`;
}

/**
 * Une noticias de getBogotaGovNews con las complementarias, sin duplicar por URL/título.
 * Preserva la propiedad no estándar _debugInfo del array principal si existía.
 * @param {Array} primary
 * @param {Array} extra
 * @param {number} maxTotal
 */
export function mergeNewsDeduped(primary, extra, maxTotal = 45) {
  const seen = new Set();
  const out = [];
  for (const n of [...(primary || []), ...(extra || [])]) {
    const k = newsKey(n);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(n);
    if (out.length >= maxTotal) break;
  }
  const dbg = primary && primary._debugInfo;
  if (dbg) out._debugInfo = dbg;
  return out;
}

function isElTiempoMobilityItem(title, description) {
  const text = `${title || ''} ${description || ''}`;
  return EL_TIEMPO_MOBILITY_RE.test(text);
}

async function fetchXmlOrHtml(url) {
  const res = await axios.get(url, {
    timeout: REQUEST_MS,
    headers: AXIOS_HEADERS,
    validateStatus: (s) => s >= 200 && s < 400,
    responseType: 'text',
  });
  return res.data;
}

/**
 * @param {string} xml
 * @param {{ incidentSource: string, maxItems: number }} opts
 */
function parseRssChannel(xml, opts) {
  const { incidentSource, maxItems } = opts;
  const $ = cheerio.load(xml, { xmlMode: true, decodeEntities: true });
  const items = [];
  const now = Date.now();

  $('item').each((_, el) => {
    if (items.length >= maxItems) return false;
    const $el = $(el);
    const title = $el.find('title').first().text().trim();
    let link = $el.find('link').first().text().trim();
    if (!link) {
      link = $el.find('guid').first().text().trim();
    }
    const pubRaw = $el.find('pubDate').first().text().trim();
    const descHtml = $el.find('description').first().text() || '';
    const plainDesc = stripTags(descHtml).slice(0, 1200);

    if (!title || !link) return;

    if (incidentSource === 'eltiempo.com-bogota-rss') {
      if (!isElTiempoMobilityItem(title, plainDesc)) return;
    }

    let ts =
      extractDatetimeFromSnippet(descHtml) ||
      (parseRfc2822OrIsoDate(pubRaw) ? parseRfc2822OrIsoDate(pubRaw).toISOString() : null);
    if (!ts) ts = new Date().toISOString();
    if (now - new Date(ts).getTime() > MAX_AGE_MS) return;

    items.push({
      id: slugId(incidentSource === 'eltiempo.com-bogota-rss' ? 'et' : 'sdm', link),
      title,
      content: plainDesc || title,
      locations: [],
      url: link,
      timestamp: ts,
      incidentSource,
    });
    return undefined;
  });

  return items;
}

async function fetchSdmRssNews() {
  try {
    const xml = await fetchXmlOrHtml(SDM_RSS);
    return parseRssChannel(xml, { incidentSource: 'movilidadbogota.gov.co', maxItems: 18 });
  } catch (e) {
    console.warn('⚠️ RSS movilidadbogota.gov.co:', e.message);
    return [];
  }
}

async function fetchElTiempoBogotaFiltered() {
  try {
    const xml = await fetchXmlOrHtml(EL_TIEMPO_BOGOTA_RSS);
    return parseRssChannel(xml, { incidentSource: 'eltiempo.com-bogota-rss', maxItems: 10 });
  } catch (e) {
    console.warn('⚠️ RSS El Tiempo Bogotá:', e.message);
    return [];
  }
}

async function fetchSdmHomepageCards() {
  try {
    const html = await fetchXmlOrHtml(SDM_HOME);
    const $ = cheerio.load(html);
    const out = [];
    const now = Date.now();

    $('.card-noticia.views-row').each((_, row) => {
      if (out.length >= 10) return false;
      const $row = $(row);
      const $a = $row.find('.views-field-title-1 a[href^="/noticias/"]').first();
      if (!$a.length) return;
      const title = $a.text().trim();
      const href = $a.attr('href');
      if (!title || !href) return;
      const url = href.startsWith('http') ? href : `https://www.movilidadbogota.gov.co${href}`;
      const summary = $row.find('.views-field-field-resumen .field-content').first().text().trim();
      const dt = $row.find('time[datetime]').first().attr('datetime');
      let ts = dt ? new Date(dt).toISOString() : null;
      if (!ts || Number.isNaN(new Date(ts).getTime())) ts = new Date().toISOString();
      if (now - new Date(ts).getTime() > MAX_AGE_MS) return;

      out.push({
        id: slugId('sdm-home', url),
        title,
        content: summary || title,
        locations: [],
        url,
        timestamp: ts,
        incidentSource: 'movilidadbogota.gov.co',
      });
      return undefined;
    });

    return out;
  } catch (e) {
    console.warn('⚠️ Listado noticias SDM (homepage):', e.message);
    return [];
  }
}

/**
 * Noticias complementarias listas para el mismo pipeline que getBogotaGovNews (mismo shape + incidentSource).
 */
export async function getSupplementalMobilityNews() {
  const [rssSdm, homeSdm, elTiempo] = await Promise.all([
    fetchSdmRssNews(),
    fetchSdmHomepageCards(),
    fetchElTiempoBogotaFiltered(),
  ]);

  const merged = mergeNewsDeduped([], [...rssSdm, ...homeSdm, ...elTiempo], 35);
  console.log(
    `📡 Fuentes complementarias: SDM RSS ${rssSdm.length}, SDM web ${homeSdm.length}, El Tiempo (filtrado) ${elTiempo.length} → únicos ${merged.length}`
  );
  return merged;
}
