import axios from 'axios';
import * as cheerio from 'cheerio';
import { getCachedScraping, saveCachedScraping } from '../database/incidents.js';

const BOGOTA_GOV_URL = 'https://bogota.gov.co/mi-ciudad/movilidad/en-vivo-movilidad-bogota-y-rutas-transmilenio';
const CACHE_DURATION_MINUTES = 30;

/**
 * Obtiene actualizaciones en vivo de bogota.gov.co
 * @returns {Promise<Array>} Array de actualizaciones
 */
export async function getBogotaGovUpdates() {
  try {
    // Verificar cache primero
    const cached = await getCachedScraping();
    if (cached && isCacheValid(cached.timestamp)) {
      console.log('✅ Usando cache de bogota.gov.co');
      return cached.data;
    }

    console.log('🔍 Scrapeando bogota.gov.co...');
    
    const response = await axios.get(`${BOGOTA_GOV_URL}-${getCurrentDateString()}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const updates = [];

    // Buscar secciones de actualizaciones (estructura puede variar)
    // Buscar por formato "Corte HH:MM a/p. m."
    const contentText = $('main, article, .content').text();
    
    // Extraer actualizaciones por patrón de "Corte" seguido de hora
    const updatePattern = /Corte\s+(\d{1,2}:\d{2}\s+[ap]\.\s*m\.)[\s\S]*?(?=Corte|$)/gi;
    let match;
    let updateId = 1;

    while ((match = updatePattern.exec(contentText)) !== null && updateId <= 20) {
      const fullText = match[0];
      const timeMatch = match[1];
      
      // Extraer ubicaciones (líneas que empiezan con 📍)
      const locationMatches = fullText.match(/📍[^\n]+/g) || [];
      const locations = locationMatches.map(loc => loc.replace('📍', '').trim());

      // Extraer descripción principal
      const description = fullText.substring(0, 500).trim();

      if (description.length > 20) { // Solo agregar si tiene contenido suficiente
        updates.push({
          id: `bogota-${updateId++}`,
          timestamp: parseTimestamp(timeMatch),
          title: `Actualización ${timeMatch}`,
          content: description,
          locations: locations,
          url: `${BOGOTA_GOV_URL}-${getCurrentDateString()}`
        });
      }
    }

    // Si no se encontraron actualizaciones con el patrón, usar texto completo
    if (updates.length === 0 && contentText.length > 100) {
      updates.push({
        id: 'bogota-fallback',
        timestamp: new Date().toISOString(),
        title: 'Actualización de movilidad',
        content: contentText.substring(0, 2000),
        locations: [],
        url: `${BOGOTA_GOV_URL}-${getCurrentDateString()}`
      });
    }

    // Guardar en cache
    if (updates.length > 0) {
      await saveCachedScraping(updates);
    }

    console.log(`✅ Encontradas ${updates.length} actualizaciones de bogota.gov.co`);
    return updates;

  } catch (error) {
    console.error('Error scraping bogota.gov.co:', error.message);
    
    // Intentar usar cache aunque esté expirado
    const staleCache = await getCachedScraping();
    if (staleCache) {
      console.log('⚠️ Usando cache expirado debido a error');
      return staleCache.data;
    }
    
    return [];
  }
}

/**
 * Obtiene string de fecha actual para URL (formato: DD-de-mes-YYYY)
 */
function getCurrentDateString() {
  const now = new Date();
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  
  return `${day}-de-${month}-${year}`;
}

/**
 * Parsea timestamp de formato "HH:MM a/p. m." a ISO
 */
function parseTimestamp(timeStr) {
  const now = new Date();
  const [time, period] = timeStr.toLowerCase().replace(/\./g, '').split(/\s+/);
  const [hours, minutes] = time.split(':');
  
  let hour24 = parseInt(hours);
  if (period === 'pm' && hour24 !== 12) hour24 += 12;
  if (period === 'am' && hour24 === 12) hour24 = 0;
  
  const result = new Date(now);
  result.setHours(hour24, parseInt(minutes), 0, 0);
  
  // Si la hora es mayor a la actual, asumir que es de ayer
  if (result > now) {
    result.setDate(result.getDate() - 1);
  }
  
  return result.toISOString();
}

/**
 * Verifica si el cache es válido
 */
function isCacheValid(cacheTimestamp) {
  const cacheAge = (Date.now() - new Date(cacheTimestamp).getTime()) / 1000 / 60;
  return cacheAge < CACHE_DURATION_MINUTES;
}
