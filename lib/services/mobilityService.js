import { getTweetsBySector, getAllRecentTweets } from './twitterService.js';
import { getBogotaGovNews } from './scrapingService.js';
import { getSupplementalMobilityNews, mergeNewsDeduped } from './supplementalMobilityFeedsService.js';
import { getWazeIncidents, WAZE_ENABLED } from './wazeService.js';
import { extractLocations, classifyIncident } from './nlpService.js';
import { geocodeSector, calculateDistance } from './geocodingService.js';
import { validateMobilityReport } from './aiValidationService.js';
import { 
  getCachedIncidents, 
  saveCachedIncidents,
  getGeneralMobilityCache,
  shouldUpdateGeneralCache,
  saveGeneralMobilityCache
} from '../db/incidents.js';
import { readBackendLog, getLastLogLines } from '../utils/logReader.js';
import { extractRelevantSection } from '../utils/contentExtractor.js';

// ─────────────────── Frescura de incidentes ───────────────────
// Umbrales centralizados para filtrar/anotar incidentes por antigüedad.
export const FRESHNESS_THRESHOLDS = {
  MAX_AGE_DAYS: 7,
  STALE_AGE_HOURS: 24,
};

export function getIncidentAge(incident) {
  if (!incident?.timestamp) return null;
  const ts = new Date(incident.timestamp);
  if (Number.isNaN(ts.getTime())) return null;
  return Date.now() - ts.getTime();
}

export function isIncidentTooOld(
  incident,
  maxAgeMs = FRESHNESS_THRESHOLDS.MAX_AGE_DAYS * 24 * 60 * 60 * 1000
) {
  const age = getIncidentAge(incident);
  if (age === null) return false;
  return age > maxAgeMs;
}

export function annotateIncidentFreshness(incident) {
  const age = getIncidentAge(incident);
  if (age === null) return { ...incident, freshness: 'unknown' };
  const hours = age / (1000 * 60 * 60);
  let freshness = 'fresh';
  if (hours > 24 * FRESHNESS_THRESHOLDS.MAX_AGE_DAYS) {
    freshness = 'expired';
  } else if (hours > FRESHNESS_THRESHOLDS.STALE_AGE_HOURS) {
    freshness = 'stale';
  } else if (hours > 1) {
    freshness = 'recent';
  } else {
    freshness = 'fresh';
  }
  return { ...incident, freshness, ageHours: Math.round(hours * 10) / 10 };
}

/**
 * Obtiene problemas de movilidad para un sector específico
 * @param {string} sector - Nombre del sector (ej: "Avenida Boyacá")
 * @param {string|null} lat - Latitud opcional
 * @param {string|null} lng - Longitud opcional
 * @param {string|null} source - Fuente específica a usar (opcional): 'twitter', 'bogota', 'bogota-news', 'waze' (pendiente), 'all'
 * @param {boolean} skipCache - Si es true, no usa caché ni base de datos, solo consulta fuentes directamente
 * @param {Function|null} onIncidentFound - Callback que se llama cada vez que se encuentra un incidente (para streaming)
 * @param {Function|null} onProgress - Callback que se llama para reportar progreso (para streaming)
 * @returns {Promise<Object>} Resultados filtrados por sector
 */
export async function getMobilityBySector(sector, lat = null, lng = null, source = null, skipCache = false, onIncidentFound = null, onProgress = null) {
  // Inicializar variables que deben sobrevivir al catch exterior
  let debugInfo = {};
  let coordinates = null;
  const allIncidents = [];

  // Helper function para agregar incidentes (también llama al callback si está disponible).
  // Aplica filtro de antigüedad (>7 días se descarta) y anota freshness para que la UI muestre badges.
  const addIncident = (incident) => {
    if (isIncidentTooOld(incident)) {
      console.log(`⏰ Incidente descartado por antigüedad (>${FRESHNESS_THRESHOLDS.MAX_AGE_DAYS} días): ${incident.title || incident.id}`);
      return;
    }
    const annotated = annotateIncidentFreshness(incident);
    allIncidents.push(annotated);
    if (onIncidentFound) {
      onIncidentFound(annotated);
    }
  };

  try {
    // Leer el log del backend para tener contexto actualizado
    try {
      const logData = readBackendLog();
      if (logData.modified && logData.content) {
        const lastLines = getLastLogLines(50);
        console.log(`📋 Log del backend actualizado (${logData.mtime ? logData.mtime.toISOString() : 'N/A'})`);
        // Analizar el log para detectar errores o patrones relevantes
        const errorLines = lastLines.split('\n').filter(line => 
          /error|warning|⚠️|❌|failed|timeout/i.test(line)
        );
        if (errorLines.length > 0) {
          console.log(`⚠️ Errores detectados en el log: ${errorLines.length} líneas`);
          // Mostrar los últimos errores relevantes
          const recentErrors = errorLines.slice(-5);
          recentErrors.forEach(err => console.log(`   ${err.substring(0, 100)}`));
        }
      }
    } catch (logError) {
      // Si hay error leyendo el log, no fallar la búsqueda
      console.warn('⚠️ Error leyendo log del backend:', logError.message);
    }

    if (source === 'waze' && !WAZE_ENABLED) {
      console.log('ℹ️ Fuente Waze desactivada (pendiente); usando todas las fuentes disponibles.');
      source = 'all';
    }

    // 1. Geocodificar el sector si no hay coordenadas
    if (lat && lng) {
      coordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };
      console.log(`📍 Coordenadas proporcionadas: ${coordinates.lat}, ${coordinates.lng}`);
    } else {
      coordinates = await geocodeSector(sector);
      if (coordinates) {
        console.log(`📍 Sector geocodificado: "${sector}" → ${coordinates.lat}, ${coordinates.lng}`);
      }
    }

    if (!coordinates) {
      throw new Error(`No se pudo geocodificar el sector: ${sector}`);
    }

    // 2. Consultar APIs externas PRIMERO (intentar obtener datos nuevos)
    // NOTA: Siempre intentamos obtener datos nuevos, incluso si hay cache
    // El cache solo se usa como fallback si el scraping/API falla
    if (skipCache) {
      console.log(`🔍 Consultando APIs para sector: ${sector} (CACHÉ DESACTIVADO - solo fuentes directas)`);
    } else {
      console.log(`🔍 Consultando APIs para sector: ${sector} (siempre intentamos obtener datos nuevos)`);
    }
    
    let tweets = [];
    let bogotaNews = [];
    let wazeIncidents = [];
    
    // Función helper para crear wazePromise solo cuando sea necesario
    const createWazePromise = () => {
      return Promise.race([
        getWazeIncidents(coordinates, 5000),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Waze timeout (25s)')), 25000)
        )
      ]).catch(error => {
        console.warn(`⚠️ Waze timeout o error (no bloquea la búsqueda): ${error.message}`);
        return [];
      });
    };
    
    try {
      // Si se especifica una fuente, solo usar esa fuente
      let results = [];
      if (source && source !== 'all') {
        console.log(`🔍 Buscando solo en fuente: ${source}`);
        
        if (source === 'twitter') {
          results = await Promise.allSettled([getTweetsBySector(sector, coordinates)]);
          tweets = results[0].status === 'fulfilled' ? results[0].value : [];
          bogotaNews = [];
          wazeIncidents = [];
        } else if (source === 'bogota-news' || source === 'bogota.gov.co' || source === 'bogota') {
          // Usar solo Bogotá News (más robusto, busca en página principal y descubre blogposts del día)
          // Pasar el sector como userQuery para validar títulos y cortes con IA
          results = await Promise.allSettled([getBogotaGovNews(sector)]);
          tweets = [];
          bogotaNews = results[0].status === 'fulfilled' ? results[0].value : [];
          // Capturar información de debug si está disponible
          if (Array.isArray(bogotaNews) && bogotaNews._debugInfo) {
            debugInfo = bogotaNews._debugInfo;
          }
          wazeIncidents = []; // NO buscar en Waze si solo se selecciona bogota-news
        } else if (source === 'waze') {
          const wazePromise = createWazePromise();
          results = await Promise.allSettled([wazePromise]);
          tweets = [];
          bogotaNews = [];
          wazeIncidents = results[0].status === 'fulfilled' ? results[0].value : [];
        } else {
          console.warn(`⚠️ Fuente desconocida: ${source}, usando todas las fuentes`);
          const wazePromise = createWazePromise();
          results = await Promise.allSettled([
            getTweetsBySector(sector, coordinates),
            getBogotaGovNews(sector), // Solo usar Bogotá News (más robusto) - pasar sector para validación IA
            wazePromise
          ]);
          tweets = results[0].status === 'fulfilled' ? results[0].value : [];
          bogotaNews = results[1].status === 'fulfilled' ? results[1].value : [];
          // Capturar información de debug si está disponible
          if (Array.isArray(bogotaNews) && bogotaNews._debugInfo) {
            debugInfo = bogotaNews._debugInfo;
          }
          wazeIncidents = results[2].status === 'fulfilled' ? results[2].value : [];
        }
      } else {
        // Si no se especifica fuente o es 'all', usar todas las fuentes
        const wazePromise = createWazePromise();
        results = await Promise.allSettled([
          getTweetsBySector(sector, coordinates),
          getBogotaGovNews(sector), // Solo usar Bogotá News (más robusto) - pasar sector para validación IA
          wazePromise
        ]);
        
        // Extraer valores de los resultados
        tweets = results[0].status === 'fulfilled' ? results[0].value : [];
        bogotaNews = results[1].status === 'fulfilled' ? results[1].value : [];
        // Capturar información de debug si está disponible
        if (Array.isArray(bogotaNews) && bogotaNews._debugInfo) {
          debugInfo = bogotaNews._debugInfo;
        }
        wazeIncidents = results[2].status === 'fulfilled' ? results[2].value : [];
      }

      if (source !== 'twitter' && source !== 'waze') {
        try {
          const extraNews = await getSupplementalMobilityNews();
          bogotaNews = mergeNewsDeduped(bogotaNews, extraNews, 45);
        } catch (supErr) {
          console.warn('⚠️ Fuentes complementarias (RSS / SDM / prensa):', supErr.message);
        }
      }
      
      // Log de errores si los hay
      if (source && source !== 'all') {
        // Solo loguear errores para la fuente específica usada
        if (source === 'twitter' && results[0] && results[0].status === 'rejected') {
          console.error(`❌ Error obteniendo tweets: ${results[0].reason.message}`);
        } else if ((source === 'bogota-news' || source === 'bogota.gov.co' || source === 'bogota') && results[0] && results[0].status === 'rejected') {
          console.error(`❌ Error obteniendo noticias de bogota.gov.co: ${results[0].reason.message}`);
        } else if (source === 'waze' && results[0] && results[0].status === 'rejected') {
          console.warn(`⚠️ Waze no disponible: ${results[0].reason.message}`);
        }
      } else {
        // Loguear errores para todas las fuentes
        if (results[0] && results[0].status === 'rejected') {
          console.error(`❌ Error obteniendo tweets: ${results[0].reason.message}`);
        }
        if (results[1] && results[1].status === 'rejected') {
          console.error(`❌ Error obteniendo noticias de bogota.gov.co: ${results[1].reason.message}`);
        }
        if (results[2] && results[2].status === 'rejected') {
          console.warn(`⚠️ Waze no disponible: ${results[2].reason.message}`);
        }
      }
      
      // Analizar frescura de los datos
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Verificar si los tweets son mock
      const mockTweetsCount = tweets.filter(t => t.id && t.id.toString().startsWith('mock-')).length;
      const realTweetsCount = tweets.length - mockTweetsCount;
      
      // Verificar frescura de noticias
      let freshNews = 0;
      let oldNews = 0;
      for (const news of bogotaNews) {
        if (news.timestamp) {
          try {
            const newsDate = new Date(news.timestamp);
            if (newsDate >= oneHourAgo) {
              freshNews++;
            } else if (newsDate >= today) {
              oldNews++;
            }
          } catch (e) {
            // No se puede determinar
          }
        }
      }
      
      console.log(`📊 Datos obtenidos: ${tweets.length} tweets (${realTweetsCount} reales, ${mockTweetsCount} mock), ${bogotaNews.length} noticias bogota.gov.co (${freshNews} frescas <1h, ${oldNews} del día), ${wazeIncidents.length} incidentes Waze`);
      
      // Advertencia si todos los datos son antiguos o mock
      if (mockTweetsCount === tweets.length && wazeIncidents.length === 0 && freshNews === 0) {
        console.warn(`⚠️ ADVERTENCIA: Todos los datos son mock o antiguos (>1 hora). No hay datos reales y actuales disponibles.`);
      } else if (freshNews === 0 && wazeIncidents.length === 0) {
        console.warn(`⚠️ ADVERTENCIA: No hay datos frescos (<1 hora). Los datos más recientes son del día de hoy pero tienen más de 1 hora.`);
      }
    } catch (error) {
      console.error(`❌ Error obteniendo datos nuevos para sector ${sector}:`, error.message || error);
      
      // Si skipCache está activado, no usar caché como fallback
      if (skipCache) {
        console.log(`⚠️ Caché desactivado - no se usará como fallback`);
        // Si skipCache está activado y hay un error, devolver resultado vacío en lugar de lanzar error
        console.log(`ℹ️ Devolviendo resultado vacío debido a error con caché desactivado`);
        return {
          source: 'api',
          incidents: [],
          coordinates: coordinates,
          isMock: false,
          debug: debugInfo || {} // Asegurar que debugInfo esté definido
        };
      }
      
      console.log(`⚠️ Intentando usar cache como fallback...`);
      
      // Si falla, intentar usar cache como fallback
      try {
    const cachedResults = await getCachedIncidents(sector, coordinates);
    if (cachedResults && Array.isArray(cachedResults) && cachedResults.length > 0) {
          console.log(`✅ Usando cache como fallback para sector: ${sector}`);
      return {
        source: 'cache',
        incidents: cachedResults,
        coordinates: coordinates,
        isMock: false // Cache siempre es real
      };
        }
      } catch (cacheError) {
        console.error(`❌ Error obteniendo cache como fallback:`, cacheError.message || cacheError);
      }

      // Si no hay cache, lanzar el error
      throw error;
    }

    // 4. Procesar y filtrar por sector
    // allIncidents ya declarado al inicio de la función

    // Procesar tweets
    for (const tweet of tweets) {
      const locations = extractLocations(tweet.text);
      
      // Si hay ubicaciones extraídas, verificar proximidad
      let relevant = false;
      if (locations.length > 0 && locations[0].coordinates) {
        // Calcular distancia para cada ubicación encontrada
        for (const loc of locations) {
          if (loc.coordinates) {
            const distance = calculateDistance(loc.coordinates, coordinates);
            if (distance < 5000) { // 5km radius
              relevant = true;
              console.log(`✅ Tweet relevante: ${distance.toFixed(0)}m de distancia (ubicación: ${loc.name || 'desconocida'})`);
              break;
            } else {
              // Si menciona el sector en el texto, no descartar por distancia
              const sectorLower = sector.toLowerCase();
              const tweetLower = tweet.text.toLowerCase();
              if (tweetLower.includes(sectorLower)) {
                console.log(`✅ Tweet relevante: menciona "${sector}" aunque esté a ${distance.toFixed(0)}m`);
                relevant = true;
              break;
            } else {
              console.log(`❌ Tweet descartado: ${distance.toFixed(0)}m de distancia (>5km) - ubicación: ${loc.name || 'desconocida'}`);
            }
          }
        }
        }
      }
      
      // Si no es relevante por distancia, verificar por texto (también si no se extrajeron ubicaciones o no tienen coordenadas)
      if (!relevant) {
        const sectorLower = sector.toLowerCase();
        const tweetLower = tweet.text.toLowerCase();
        relevant = tweetLower.includes(sectorLower);
        if (relevant) {
          console.log(`✅ Tweet relevante: coincidencia de texto "${sector}" (${locations.length > 0 && !locations[0].coordinates ? 'ubicación sin coordenadas' : 'no se extrajo ubicación'})`);
        } else {
          console.log(`❌ Tweet descartado: no menciona "${sector}" y ${locations.length > 0 && !locations[0].coordinates ? 'ubicación sin coordenadas' : 'sin ubicación'}`);
        }
      }

      if (relevant) {
        // Solo generar URL si el tweet es real (no mock) y tiene ID válido
        // Los tweets mock tienen IDs que empiezan con "mock-"
        const isMockTweet = tweet.id && tweet.id.toString().startsWith('mock-');
        const tweetUrl = (isMockTweet || !tweet.id) ? null : `https://twitter.com/i/web/status/${tweet.id}`;
        
        const incident = {
          id: `tweet-${tweet.id}`,
          type: classifyIncident(tweet.text),
          title: tweet.text.substring(0, 100),
          description: tweet.text,
          source: 'twitter',
          sourceAccount: tweet.author_id,
          timestamp: tweet.created_at,
          location: locations[0],
          coordinates: locations[0]?.coordinates || null,
          url: tweetUrl
        };
        addIncident(incident);
      }
    }

    // Nota: Ya no procesamos bogotaUpdates, solo usamos bogotaNews que es más robusto
    // El siguiente código está comentado porque solo usamos bogotaNews
    /*
    for (const update of bogotaUpdates) {
      const locations = extractLocations(update.content);
      
      // Verificar relevancia
      let relevant = false;
      if (locations.length > 0 && locations[0].coordinates) {
        // Calcular distancia para cada ubicación encontrada
        for (const loc of locations) {
          if (loc.coordinates) {
            const distance = calculateDistance(loc.coordinates, coordinates);
            if (distance < 5000) { // 5km radius
              relevant = true;
              console.log(`✅ Actualización relevante: ${distance.toFixed(0)}m de distancia (ubicación: ${loc.name || 'desconocida'})`);
              break;
            } else {
              // Si menciona el sector en el contenido, no descartar por distancia
              const sectorLower = sector.toLowerCase();
              const contentLower = update.content.toLowerCase();
              if (contentLower.includes(sectorLower)) {
                console.log(`✅ Actualización relevante: menciona "${sector}" aunque esté a ${distance.toFixed(0)}m`);
                relevant = true;
              break;
            } else {
              console.log(`❌ Actualización descartada: ${distance.toFixed(0)}m de distancia (>5km) - ubicación: ${loc.name || 'desconocida'}`);
              }
            }
          }
        }
      }
      
      // También verificar por texto
      const sectorLower = sector.toLowerCase();
      if (!relevant) {
        relevant = update.content.toLowerCase().includes(sectorLower);
        if (relevant) {
          console.log(`✅ Actualización relevante: coincidencia de texto (no se extrajo ubicación)`);
        }
      }

      if (relevant) {
        allIncidents.push({
          id: `bogota-${update.id}`,
          type: classifyIncident(update.content),
          title: update.title || update.content.substring(0, 100),
          description: update.content,
          source: 'bogota.gov.co',
          timestamp: update.timestamp,
          location: locations[0] || { name: sector },
          coordinates: locations[0]?.coordinates || null,
          url: update.url || null
        });
      }
    }
    */

    // 5. Procesar noticias/blogposts de bogota.gov.co
    // Una noticia puede generar múltiples incidentes (uno por cada ubicación mencionada)
    for (const news of bogotaNews) {
      const incidentSource = news.incidentSource || 'bogota.gov.co-news';
      // Extraer ubicaciones de la noticia
      const locations = [];
      if (news.locations && news.locations.length > 0) {
        for (const locName of news.locations) {
          try {
            // Intentar extraer ubicación con NLP
            const loc = await extractLocations(locName);
            if (loc && loc.length > 0) {
              locations.push(...loc);
            } else {
              // Si no se extrajo con NLP, intentar geocodificar directamente
              const geocoded = await geocodeSector(locName);
              if (geocoded) {
                // Verificar que esté en Bogotá (aproximadamente)
                if (geocoded.lat >= 4.4 && geocoded.lat <= 4.8 && geocoded.lng >= -74.2 && geocoded.lng <= -73.9) {
                  locations.push({ name: locName, coordinates: geocoded });
                  console.log(`📍 Geocodificada ubicación "${locName}" para incidente de evento: ${geocoded.lat}, ${geocoded.lng}`);
                } else {
                  console.warn(`⚠️ Ubicación "${locName}" está fuera de Bogotá, omitiendo`);
                }
              } else {
                // Si no se pudo geocodificar, usar la ubicación sin coordenadas
                locations.push({ name: locName, coordinates: null });
              }
            }
          } catch (error) {
            // Si hay error, intentar geocodificar directamente
            try {
              const geocoded = await geocodeSector(locName);
              if (geocoded && geocoded.lat >= 4.4 && geocoded.lat <= 4.8 && geocoded.lng >= -74.2 && geocoded.lng <= -73.9) {
                locations.push({ name: locName, coordinates: geocoded });
                console.log(`📍 Geocodificada ubicación "${locName}" para incidente de evento (fallback): ${geocoded.lat}, ${geocoded.lng}`);
              } else {
                locations.push({ name: locName, coordinates: null });
              }
            } catch (geocodeError) {
              locations.push({ name: locName, coordinates: null });
            }
          }
        }
      }
      
      // Si no hay ubicaciones extraídas, intentar extraer del contenido
      if (locations.length === 0) {
        const locationPattern = /(?:av\.|avenida|calle|carrera|transversal|autopista|localidad|sector|zona|vía|universidad|portal|aeropuerto)\s+[^\n\.\,\;]+/gi;
        const contentLocations = (news.content || '').match(locationPattern) || [];
        for (const locText of contentLocations) {
          if (locText.trim().length > 5) {
            locations.push({ name: locText.trim(), coordinates: null });
          }
        }
      }
      
      // Verificar relevancia
      let relevant = false;
      
      // Primero verificar por texto (más confiable para ubicaciones largas como autopistas)
      const sectorLower = sector.toLowerCase();
      const contentLower = (news.content || '').toLowerCase();
      const titleLower = (news.title || '').toLowerCase();
      
      // Normalizar variaciones comunes de autopista norte y el campín
      const sectorNormalized = sectorLower
        .replace(/autonorte/gi, 'autopista norte')
        .replace(/nqs/gi, 'autopista norte')
        .replace(/el campín/gi, 'campín')
        .replace(/estadio nemesio camacho/gi, 'campín')
        .replace(/estadio el campín/gi, 'campín')
        .trim();
      
      const contentNormalized = contentLower
        .replace(/autonorte/gi, 'autopista norte')
        .replace(/nqs/gi, 'autopista norte')
        .replace(/el campín/gi, 'campín')
        .replace(/estadio nemesio camacho/gi, 'campín')
        .replace(/estadio el campín/gi, 'campín');
      
      const titleNormalized = titleLower
        .replace(/autonorte/gi, 'autopista norte')
        .replace(/nqs/gi, 'autopista norte')
        .replace(/el campín/gi, 'campín')
        .replace(/estadio nemesio camacho/gi, 'campín')
        .replace(/estadio el campín/gi, 'campín');
      
      // Verificar si el contenido o título menciona el sector (normalizado)
      if (contentNormalized.includes(sectorNormalized) || titleNormalized.includes(sectorNormalized)) {
        relevant = true;
        console.log(`✅ Noticia relevante: coincidencia de texto "${sector}" (normalizado)`);
      }
      
      // Verificación adicional para "el campín" - buscar ubicaciones cercanas
      if (!relevant && (sectorNormalized.includes('campín') || sectorNormalized.includes('el campín'))) {
        const campinRelatedTerms = ['estadio', 'campín', 'movistar arena', 'arena', 'calle 57', 'calle 63', 'transversal 28', 'carrera 28', 'avenida nqs', 'avenida carrera 30'];
        const hasRelatedTerm = campinRelatedTerms.some(term => 
          contentNormalized.includes(term) || titleNormalized.includes(term)
        );
        if (hasRelatedTerm) {
          relevant = true;
          console.log(`✅ Noticia relevante: menciona ubicación cercana a "${sector}"`);
        }
      }
      
      // Si no es relevante por texto, verificar por distancia
      if (!relevant && locations.length > 0) {
        for (const loc of locations) {
          if (loc.coordinates) {
            const distance = calculateDistance(loc.coordinates, coordinates);
            if (distance < 5000) {
              relevant = true;
              console.log(`✅ Noticia relevante: ${distance.toFixed(0)}m de distancia (ubicación: ${loc.name || 'desconocida'})`);
              break;
            }
          }
        }
      }
      
      // Si aún no es relevante, verificar si alguna ubicación extraída coincide con el sector
      if (!relevant && locations.length > 0) {
        for (const loc of locations) {
          const locNameLower = (loc.name || '').toLowerCase()
            .replace(/autonorte/gi, 'autopista norte')
            .replace(/nqs/gi, 'autopista norte');
          
          if (locNameLower.includes(sectorNormalized) || sectorNormalized.includes(locNameLower)) {
            relevant = true;
            console.log(`✅ Noticia relevante: ubicación extraída coincide con sector "${sector}" (${loc.name})`);
            break;
          }
        }
      }

      if (relevant) {
        // Verificar si ya existe un incidente similar (evitar duplicados)
        // Para eventos, verificar por ubicación y contenido específico
        const newsContentHash = (news.content || '').substring(0, 100).toLowerCase().trim();
        const newsLocationName = locations.length > 0 ? locations[0].name : null;
        const isDuplicate = allIncidents.some(inc => {
          const incContentHash = (inc.description || '').substring(0, 100).toLowerCase().trim();
          const incLocationName = inc.location?.name || null;
          
          // Si es un evento, verificar por ubicación y contenido
          if (news.type === 'evento' && newsLocationName && incLocationName) {
            return incContentHash === newsContentHash && 
                   incLocationName.toLowerCase() === newsLocationName.toLowerCase() &&
                   inc.timestamp === news.timestamp &&
                   inc.url === news.url;
          }
          
          // Para otros tipos, verificar por contenido, timestamp y URL
          return incContentHash === newsContentHash && 
                 inc.timestamp === news.timestamp &&
                 inc.url === news.url;
        });
        
        if (isDuplicate) {
          console.log(`⚠️ Omitiendo incidente duplicado: ${news.title}${newsLocationName ? ` (${newsLocationName})` : ''}`);
          continue;
        }
        
        // Validación de IA con DeepSeek (si está configurado) - DESPUÉS DEL SCRAPING
        let aiValidation = null;
        try {
          console.log(`🤖 Validando reporte con IA: ${news.title}`);
          aiValidation = await validateMobilityReport(news, sector);
          
          // Si la IA determina que no es válido, omitir
          if (!aiValidation.isValid) {
            console.log(`⚠️ Reporte descartado por validación de IA: ${news.title}`);
            console.log(`   Razón: ${aiValidation.reason || 'No es un incidente real de movilidad'}`);
            continue;
          }
          
          // Si hay búsqueda del usuario y la IA determina que no es relevante, omitir
          if (sector && aiValidation.isRelevantToQuery === false) {
            console.log(`⚠️ Reporte descartado por validación de IA (no relevante para "${sector}"): ${news.title}`);
            console.log(`   Razón: ${aiValidation.reason || 'No relevante para la búsqueda del usuario'}`);
            continue;
          }
          
          // Si la IA detectó un tipo de incidente diferente, usar el de la IA
          if (aiValidation.incidentType && aiValidation.incidentType !== 'otro') {
            console.log(`🤖 IA detectó tipo de incidente: ${aiValidation.incidentType} (confianza: ${aiValidation.confidence})`);
          }
          
          // Si la IA extrajo ubicaciones adicionales, agregarlas
          if (aiValidation.extractedLocations && aiValidation.extractedLocations.length > 0) {
            console.log(`🤖 IA extrajo ubicaciones adicionales: ${aiValidation.extractedLocations.join(', ')}`);
            // Agregar ubicaciones extraídas por la IA a la lista de ubicaciones
            for (const locName of aiValidation.extractedLocations) {
              if (!locations.some(loc => loc.name && loc.name.toLowerCase().includes(locName.toLowerCase()))) {
                try {
                  const extractedLoc = await extractLocations(locName);
                  if (extractedLoc && extractedLoc.length > 0) {
                    locations.push(...extractedLoc);
                  } else {
                    locations.push({ name: locName, coordinates: null });
                  }
                } catch (error) {
                  locations.push({ name: locName, coordinates: null });
                }
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error en validación de IA para ${news.title}:`, error.message);
          // Continuar con el procesamiento normal si hay error en la validación de IA
        }
        
        // Log de frescura de la noticia
        if (news.timestamp) {
          try {
            const newsDate = new Date(news.timestamp);
            const now = new Date();
            const hoursAgo = (now.getTime() - newsDate.getTime()) / (1000 * 60 * 60);
            const isToday = newsDate >= today;
            
            if (hoursAgo < 1) {
              console.log(`✅ Noticia relevante (FRESCA, ${hoursAgo.toFixed(1)}h atrás): ${news.title}`);
            } else if (isToday) {
              console.log(`✅ Noticia relevante (DEL DÍA, ${hoursAgo.toFixed(1)}h atrás): ${news.title}`);
            } else {
              console.log(`⚠️ Noticia relevante (ANTIGUA, ${hoursAgo.toFixed(1)}h atrás): ${news.title}`);
            }
          } catch (e) {
            console.log(`✅ Noticia relevante: ${news.title}`);
          }
        } else {
          console.log(`✅ Noticia relevante: ${news.title}`);
        }
        
        // Clasificar el incidente basándose en el contenido, no solo en el título
        // Si la IA detectó un tipo de incidente, usar ese; sino usar el clasificador tradicional
        let incidentType = aiValidation && aiValidation.incidentType && aiValidation.incidentType !== 'otro'
          ? aiValidation.incidentType
          : classifyIncident(news.content || news.title);
        
        // Si el título menciona manifestación pero el contenido no, usar el contenido para clasificar
        const titleLower = (news.title || '').toLowerCase();
        const contentLower = (news.content || '').toLowerCase();
        
        // Si el título menciona "manifestación" pero el contenido no tiene contexto relevante, no clasificar como manifestación
        let finalType = incidentType;
        if (titleLower.includes('manifestación') && !contentLower.match(/(?:manifestaci[óo]n|protesta|marcha|bloqueo).*(?:en|calle|avenida|carrera|vía|movilidad|tráfico|transmilenio)/i)) {
          // Si el contenido no menciona manifestación en contexto, clasificar como "otro"
          finalType = 'otro';
        }
        
        // Si la IA detectó un tipo diferente y tiene alta confianza, usar ese
        if (aiValidation && aiValidation.incidentType && aiValidation.confidence > 0.7) {
          finalType = aiValidation.incidentType;
        }
        
        // Si hay múltiples ubicaciones, crear un incidente por cada una
        if (locations.length > 1) {
          // Crear un incidente por cada ubicación única
          const validLocations = [];
          
          for (const loc of locations) {
            // Intentar geocodificar cada ubicación para validar que sea de Bogotá
            let locCoordinates = loc.coordinates;
            if (!locCoordinates && loc.name) {
              try {
                const geocoded = await geocodeSector(loc.name);
                if (geocoded) {
                  // Verificar que esté en Bogotá (aproximadamente)
                  if (geocoded.lat >= 4.4 && geocoded.lat <= 4.8 && geocoded.lng >= -74.2 && geocoded.lng <= -73.9) {
                    locCoordinates = geocoded;
                    console.log(`📍 Geocodificada ubicación "${loc.name}" para incidente: ${geocoded.lat}, ${geocoded.lng}`);
                    validLocations.push({ ...loc, coordinates: locCoordinates });
                  } else {
                    console.warn(`⚠️ Ubicación "${loc.name}" está fuera de Bogotá, omitiendo`);
                  }
                }
              } catch (error) {
                console.warn(`⚠️ No se pudo geocodificar "${loc.name}": ${error.message}`);
              }
            } else if (locCoordinates) {
              // Si ya tiene coordenadas, verificar que esté en Bogotá
              if (locCoordinates.lat >= 4.4 && locCoordinates.lat <= 4.8 && locCoordinates.lng >= -74.2 && locCoordinates.lng <= -73.9) {
                validLocations.push(loc);
              }
            } else {
              // Si no tiene coordenadas pero menciona el sector buscado, usar las coordenadas del sector
              if (loc.name.toLowerCase().includes(sector.toLowerCase())) {
                validLocations.push({ ...loc, coordinates: coordinates });
              }
            }
          }
          
          // Si después de validar no hay ubicaciones válidas, crear un solo incidente
          if (validLocations.length === 0) {
            const loc = locations[0] || { name: sector, coordinates: null };
            let finalCoordinates = loc.coordinates || coordinates;
            
            const incident = {
              id: `bogota-news-${news.id}`,
              type: finalType,
              title: news.title || news.content.substring(0, 100),
              description: news.content,
              source: incidentSource,
              timestamp: news.timestamp,
              location: { name: loc.name, coordinates: finalCoordinates },
              coordinates: finalCoordinates,
              url: news.url || null
            };
            addIncident(incident);
          } else {
            // Crear un incidente por cada ubicación válida
            for (const loc of validLocations) {
              // Extraer solo la sección relevante de la noticia para esta ubicación
              const relevantContent = extractRelevantSection(news.content, loc.name, finalType);
              
              // Si no se encontró contenido relevante, usar el contenido original pero limpio
              const description = relevantContent || news.content;
              
              // Crear título específico para esta ubicación
              const locationTitle = news.title && news.title.includes(loc.name) 
                ? news.title 
                : `${news.title || 'Incidente'} - ${loc.name}`;
              
              const incident = {
                id: `bogota-news-${news.id}-${validLocations.indexOf(loc)}`,
                type: finalType,
                title: locationTitle,
                description: description,
                source: incidentSource,
                timestamp: news.timestamp,
                location: { name: loc.name, coordinates: loc.coordinates },
                coordinates: loc.coordinates,
                url: news.url || null
              };
              addIncident(incident);
            }
          }
        } else {
          // Si solo hay una ubicación (o ninguna), crear un solo incidente
          const loc = locations[0] || { name: sector, coordinates: null };
          
          // Asegurar que el incidente tenga coordenadas
          let finalCoordinates = loc.coordinates;
          if (!finalCoordinates && loc.name) {
            // Intentar geocodificar la ubicación mencionada
            try {
              const geocoded = await geocodeSector(loc.name);
              if (geocoded) {
                finalCoordinates = geocoded;
                console.log(`📍 Geocodificada ubicación "${loc.name}" para incidente: ${geocoded.lat}, ${geocoded.lng}`);
              }
            } catch (error) {
              console.warn(`⚠️ No se pudo geocodificar "${loc.name}": ${error.message}`);
            }
          }
          
          // Si aún no tiene coordenadas pero menciona el sector buscado, usar las coordenadas del sector
          if (!finalCoordinates && (news.content.toLowerCase().includes(sector.toLowerCase()) || news.title.toLowerCase().includes(sector.toLowerCase()))) {
            finalCoordinates = coordinates;
            console.log(`📍 Usando coordenadas del sector buscado "${sector}" para incidente`);
          }
          
          // Extraer solo la sección relevante de la noticia para esta ubicación
          const relevantContent = extractRelevantSection(news.content, loc.name, finalType);
          
          // Si no se encontró contenido relevante, usar el contenido original pero limpio
          const description = relevantContent || news.content;
          
          const incident = {
            id: `bogota-news-${news.id}`,
            type: finalType,
            title: news.title || news.content.substring(0, 100),
            description: description,
            source: incidentSource,
            timestamp: news.timestamp,
            location: { name: loc.name, coordinates: finalCoordinates },
            coordinates: finalCoordinates,
            url: news.url || null
          };
          addIncident(incident);
        }
      }
    }

    // 6. Si no hay incidentes nuevos, intentar usar cache como fallback (solo si skipCache está desactivado)
    if (allIncidents.length === 0) {
      console.log(`⚠️ No se encontraron incidentes nuevos para sector: ${sector}`);
      
      if (skipCache) {
        console.log(`⚠️ Caché desactivado - no se usará como fallback`);
      } else {
        console.log(`⚠️ Intentando usar cache como fallback...`);
        
        const cachedResults = await getCachedIncidents(sector, coordinates);
        if (cachedResults && Array.isArray(cachedResults) && cachedResults.length > 0) {
          console.log(`✅ Usando cache como fallback para sector: ${sector}`);
          return {
            source: 'cache',
            incidents: cachedResults,
            coordinates: coordinates,
            isMock: false // Cache siempre es real
          };
        }
        
        console.log(`⚠️ No hay cache disponible para sector: ${sector}`);
      }
    }

    // 7. Guardar en cache los nuevos incidentes (solo si skipCache está desactivado)
    if (allIncidents.length > 0 && !skipCache) {
      await saveCachedIncidents(sector, coordinates, allIncidents);
      console.log(`💾 ${allIncidents.length} incidentes guardados en caché`);
    } else if (allIncidents.length > 0 && skipCache) {
      console.log(`💾 Caché desactivado - no se guardarán los ${allIncidents.length} incidentes en caché`);
    }

    // 8. Determinar si es mock: solo si TODOS los incidentes son mock
    // Si hay al menos un incidente real (bogota.gov.co, waze, o twitter real), NO es mock
    // Notas del mismo día (aunque tengan más de 1 hora) son reales
    const hasRealIncidents = allIncidents.some(incident => {
      // Incidentes de bogota.gov.co siempre son reales
      if (
        incident.source === 'bogota.gov.co' ||
        incident.source === 'bogota.gov.co-news' ||
        incident.source === 'movilidadbogota.gov.co' ||
        incident.source === 'eltiempo.com-bogota-rss'
      ) {
        return true;
      }
      // Incidentes de waze siempre son reales
      if (incident.source === 'waze') {
        return true;
      }
      // Tweets reales (no mock)
      if (incident.source === 'twitter' && incident.id && !incident.id.toString().startsWith('mock-')) {
        return true;
      }
      // Incidentes del mismo día (aunque tengan más de 1 hora) son reales
      if (incident.timestamp) {
        try {
          const incidentDate = new Date(incident.timestamp);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (incidentDate >= today) {
            return true;
          }
        } catch (e) {
          // Si no se puede parsear la fecha, no contar como real
        }
      }
      return false;
    });
    
    const hasMockTweets = tweets.length > 0 && tweets.every(tweet => tweet.id && tweet.id.toString().startsWith('mock-'));
    
    // Solo es mock si:
    // 1. Todos los tweets son mock Y
    // 2. No hay incidentes reales Y
    // 3. Todos los incidentes son mock (si hay incidentes)
    const isMock = hasMockTweets && !hasRealIncidents && 
                   (allIncidents.length === 0 || allIncidents.every(incident => 
                     (incident.source === 'twitter' && incident.id && incident.id.toString().startsWith('mock-')) ||
                     (incident.id && incident.id.toString().includes('mock-'))
                   ));

    // 9. Log final sobre el estado de los datos
    const todayForLog = new Date();
    todayForLog.setHours(0, 0, 0, 0);
    
    const realIncidentsCount = allIncidents.filter(inc => {
      if (
        inc.source === 'bogota.gov.co' ||
        inc.source === 'bogota.gov.co-news' ||
        inc.source === 'movilidadbogota.gov.co' ||
        inc.source === 'eltiempo.com-bogota-rss'
      )
        return true;
      if (inc.source === 'waze') return true;
      if (inc.source === 'twitter' && inc.id && !inc.id.toString().startsWith('mock-')) return true;
      if (inc.timestamp) {
        try {
          const incDate = new Date(inc.timestamp);
          return incDate >= todayForLog;
        } catch (e) {
          return false;
        }
      }
      return false;
    }).length;
    
    const mockIncidentsCount = allIncidents.length - realIncidentsCount;
    
    console.log(`📋 RESUMEN: ${allIncidents.length} incidentes totales (${realIncidentsCount} reales, ${mockIncidentsCount} mock). isMock=${isMock}`);
    
    if (isMock) {
      console.warn(`⚠️ ATENCIÓN: Los resultados están marcados como MOCK DATA (datos de prueba)`);
    } else if (mockIncidentsCount > 0) {
      console.log(`ℹ️ INFO: Hay ${mockIncidentsCount} incidentes mock mezclados con ${realIncidentsCount} reales`);
    }
    
    // Construir estadísticas por fuente (para diagnóstico en /buscar)
    const sourceStats = buildSourceStats({
      tweets,
      bogotaNews,
      wazeIncidents,
      allIncidents,
    });

    // 10. Retornar resultados
    return {
      source: 'api',
      incidents: allIncidents,
      coordinates: coordinates,
      isMock: isMock || false,
      sourceStats,
      debug: debugInfo // Información de debug sobre validación de títulos
    };
  } catch (error) {
    console.error('Error en getMobilityBySector:', error);
    // Asegurar que debugInfo esté definido antes de lanzar el error
    if (typeof debugInfo === 'undefined') {
      debugInfo = {};
    }
    // Si hay coordenadas, devolver resultado vacío en lugar de lanzar error
    if (coordinates) {
      return {
        source: 'api',
        incidents: [],
        coordinates: coordinates,
        isMock: false,
        sourceStats: buildSourceStats({ tweets: [], bogotaNews: [], wazeIncidents: [], allIncidents: [] }),
        debug: debugInfo
      };
    }
    throw error;
  }
}

/**
 * Construye un resumen por fuente: cuántos elementos crudos se obtuvieron,
 * cuántos terminaron siendo incidentes mostrados y el estado runtime.
 */
function buildSourceStats({ tweets, bogotaNews, wazeIncidents, allIncidents }) {
  const fromTwitter = allIncidents.filter((i) => i.source === 'twitter').length;
  const fromBogota = allIncidents.filter(
    (i) =>
      i.source === 'bogota.gov.co' ||
      i.source === 'bogota.gov.co-news' ||
      i.source === 'movilidadbogota.gov.co' ||
      i.source === 'eltiempo.com-bogota-rss'
  ).length;
  const fromWaze = allIncidents.filter((i) => i.source === 'waze').length;

  return {
    twitter: {
      id: 'twitter',
      label: 'Twitter API',
      icon: '🐦',
      fetched: tweets?.length || 0,
      matched: fromTwitter,
      status: !process.env.TWITTER_BEARER_TOKEN
        ? 'configuration_required'
        : tweets?.length > 0
        ? 'operational'
        : 'operational',
    },
    bogota: {
      id: 'bogota',
      label: 'Noticias oficiales y RSS',
      icon: '🏛️',
      fetched: bogotaNews?.length || 0,
      matched: fromBogota,
      status: 'operational',
    },
    waze: {
      id: 'waze',
      label: 'Waze Live Map',
      icon: '🗺️',
      fetched: wazeIncidents?.length || 0,
      matched: fromWaze,
      status: 'in_development',
    },
  };
}

/**
 * Verifica si un texto es relevante para problemas de movilidad
 * @param {string} text - Texto a verificar
 * @returns {boolean} true si es relevante
 */
function isRelevantMobilityAlert(text) {
  const lowerText = text.toLowerCase();
  
  // Patrones que indican que NO es relevante (respuestas simples, consultas, etc.)
  const nonRelevantPatterns = [
    /^(?:hola|hi|hello|buenos días|buenas tardes|buenas noches)/i, // Saludos iniciales
    /ind[íi]canos|ind[íi]quenos|d[íi]ganos|cu[áa]l|qu[ée]|qu[ée] pas[óo]/i, // Preguntas
    /para verificar|nuestro equipo|encargado|responder|atender/i, // Respuestas de servicio
    /^gracias|por favor|disculpe|perd[óo]n/i, // Cortesías
    /^[👋💬📧]/ // Emojis iniciales sin contenido
  ];
  
  // Si es solo una pregunta o respuesta simple, no es relevante
  if (nonRelevantPatterns.some(pattern => pattern.test(text))) {
    return false;
  }
  
  // Patrones que indican que SÍ es relevante (alertas, problemas, cierres, etc.)
  const relevantPatterns = [
    /(?:alerta|cierre|cerrado|bloqueo|afecta|interrupci[óo]n|desv[íi]o|suspensi[óo]n)/i,
    /(?:manifestaci[óo]n|protesta|marcha|bloqueo)/i,
    /(?:accidente|choque|colisi[óo]n|atropello|siniestro)/i,
    /(?:obra|rehabilitaci[óo]n|mantenimiento|cierre)/i,
    /(?:tr[áa]nsito|movilidad|veh[íi]culos|ruta|estaci[óo]n)/i,
    /(?:evita|recomendamos|precauci[óo]n|atenci[óo]n)/i,
    /#Movilidad(?:Ahora|Bogot[áa])/i // Hashtags de movilidad
  ];
  
  // Si tiene patrones relevantes, es relevante
  if (relevantPatterns.some(pattern => pattern.test(text))) {
    return true;
  }
  
  // Si tiene ubicaciones específicas y menciona algo relacionado con tráfico/movilidad
  const hasLocation = /(?:av\.?|avenida|calle|carrera|cra\.?|boyac[áa]|caracas|autonorte|autosur)/i.test(text);
  const hasMobilityTerms = /(?:tr[áa]nsito|movilidad|veh[íi]culo|ruta|estaci[óo]n|servicio)/i.test(text);
  
  return hasLocation && hasMobilityTerms;
}

/**
 * Calcula la relevancia/prioridad de un incidente
 * @param {Object} incident - Incidente a evaluar
 * @returns {number} Score de prioridad (mayor = más importante)
 */
function calculateIncidentPriority(incident) {
  let score = 0;
  
  // Tipo de incidente (más importante = más puntos)
  const typeScores = {
    'manifestación': 10,
    'accidente': 9,
    'desvío': 8,
    'obra': 7,
    'otro': 0
  };
  score += typeScores[incident.type] || 0;
  
  // Si tiene ubicación específica, más puntos
  if (incident.location && incident.coordinates) {
    score += 5;
  }
  
  // Si viene de fuentes oficiales o RSS complementario verificado, más confiable
  if (
    incident.source === 'bogota.gov.co' ||
    incident.source === 'bogota.gov.co-news' ||
    incident.source === 'movilidadbogota.gov.co' ||
    incident.source === 'eltiempo.com-bogota-rss'
  ) {
    score += 3;
  }
  
  // Si es más reciente, más puntos (pero esto se maneja en el sort)
  const hoursAgo = (Date.now() - new Date(incident.timestamp || 0).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 1) score += 3; // Menos de 1 hora
  else if (hoursAgo < 3) score += 2; // Menos de 3 horas
  else if (hoursAgo < 6) score += 1; // Menos de 6 horas
  
  return score;
}

/**
 * Obtiene problemas generales de movilidad en Bogotá (sin filtrar por sector)
 * @returns {Promise<Object>} Resultados generales con todos los incidentes
 */
export async function getGeneralMobilityProblems() {
  try {
    // 1. Verificar cache primero
    const needsUpdate = await shouldUpdateGeneralCache();
    
    if (!needsUpdate) {
      const cached = await getGeneralMobilityCache();
      if (cached && cached.incidents.length > 0) {
        console.log(`✅ Usando cache general (${cached.incidents.length} incidentes)`);
        // Filtrar y limitar desde cache también
        const filtered = filterAndPrioritizeIncidents(cached.incidents);
        
        // Verificar si los incidentes en el cache son mock
        // Un incidente es mock si su ID contiene "mock-" o si es de twitter y no tiene URL
        const hasMockIncidents = filtered.some(incident => {
          const idStr = incident.id ? incident.id.toString() : '';
          return idStr.includes('mock-') || 
                 (incident.source === 'twitter' && !incident.url && idStr.includes('mock-'));
        });
        
        return {
          source: 'cache',
          incidents: filtered,
          last_updated: cached.last_updated,
          isMock: hasMockIncidents
        };
      }
    }

    // 2. Si necesita actualización, consultar APIs externas
    console.log(`🔍 Consultando APIs para problemas generales de movilidad...`);
    
    // Obtener datos de múltiples fuentes en paralelo
    const results = await Promise.allSettled([
      getAllRecentTweets(),
      getBogotaGovNews(null), // Solo usar Bogotá News (más robusto) - sin userQuery para vista general
      getWazeIncidents({ lat: 4.6097, lng: -74.0817 }, 10000) // Centro de Bogotá, radio de 10km
    ]);
    
    // Extraer valores de los resultados
    const tweets = results[0].status === 'fulfilled' ? results[0].value : [];
    let bogotaNews = results[1].status === 'fulfilled' ? results[1].value : [];
    const wazeIncidents = results[2].status === 'fulfilled' ? results[2].value : [];

    try {
      const extraNews = await getSupplementalMobilityNews();
      bogotaNews = mergeNewsDeduped(bogotaNews, extraNews, 45);
    } catch (supErr) {
      console.warn('⚠️ Fuentes complementarias (vista general):', supErr.message);
    }
    
    // Log de errores si los hay
    if (results[0].status === 'rejected') {
      console.error(`❌ Error obteniendo tweets: ${results[0].reason.message}`);
    }
    if (results[1].status === 'rejected') {
      console.error(`❌ Error obteniendo noticias de bogota.gov.co: ${results[1].reason.message}`);
    }
    if (results[2].status === 'rejected') {
      console.error(`❌ Error obteniendo incidentes de Waze: ${results[2].reason.message}`);
    }

    console.log(`📊 Datos obtenidos: ${tweets.length} tweets, ${bogotaNews.length} noticias (Alcaldía + complementarias), ${wazeIncidents.length} incidentes Waze`);

    // Verificar si los tweets son mock (todos tienen ID que empieza con "mock-")
    const isMock = tweets.length > 0 && tweets.every(tweet => tweet.id && tweet.id.toString().startsWith('mock-'));
    
    if (isMock) {
      console.log(`⚠️ Todos los tweets son mock (datos de prueba)`);
    }

    // 3. Procesar y filtrar solo incidentes relevantes
    const allIncidents = [];
    let tweetsRelevantes = 0;
    let tweetsDescartados = 0;
    
    // Procesar tweets
    for (const tweet of tweets) {
      // Log del tweet antes de procesar
      console.log(`🔍 Procesando tweet de @${tweet.author_id}: "${tweet.text.substring(0, 80)}..."`);
      
      // Verificar si es relevante antes de procesar
      if (!isRelevantMobilityAlert(tweet.text)) {
        tweetsDescartados++;
        console.log(`❌ Tweet descartado (no relevante): ${tweet.text.substring(0, 50)}...`);
        continue;
      }
      
      tweetsRelevantes++;
      console.log(`✅ Tweet relevante encontrado: "${tweet.text.substring(0, 80)}..."`);
      
      const locations = extractLocations(tweet.text);
      const incidentType = classifyIncident(tweet.text);
      
      // Solo generar URL si el tweet es real (no mock) y tiene ID válido
      // Los tweets mock tienen IDs que empiezan con "mock-"
      const isMockTweet = tweet.id && tweet.id.toString().startsWith('mock-');
      const tweetUrl = (isMockTweet || !tweet.id) ? null : `https://twitter.com/i/web/status/${tweet.id}`;
      
      // Solo incluir si tiene un tipo relevante (excluir "otro" a menos que tenga ubicación específica)
      if (incidentType !== 'otro') {
        allIncidents.push({
          id: `tweet-${tweet.id}`,
          type: incidentType,
          title: tweet.text.substring(0, 100),
          description: tweet.text,
          source: 'twitter',
          sourceAccount: tweet.author_id,
          timestamp: tweet.created_at,
          location: locations[0] || null,
          coordinates: locations[0]?.coordinates || null,
          url: tweetUrl
        });
      } else if (locations.length > 0 && locations[0].coordinates) {
        // Si es "otro" pero tiene ubicación específica, puede ser relevante
        allIncidents.push({
          id: `tweet-${tweet.id}`,
          type: incidentType,
          title: tweet.text.substring(0, 100),
          description: tweet.text,
          source: 'twitter',
          sourceAccount: tweet.author_id,
          timestamp: tweet.created_at,
          location: locations[0],
          coordinates: locations[0].coordinates,
          url: tweetUrl
        });
      }
    }

    for (const news of bogotaNews) {
      const incidentSource = news.incidentSource || 'bogota.gov.co-news';
      const text = news.content || news.title || '';
      const locations = extractLocations(text);
      const incidentType = classifyIncident(text);

      allIncidents.push({
        id: `bogota-news-${news.id}`,
        type: incidentType,
        title: news.title || text.substring(0, 100) || 'Noticia de movilidad',
        description: news.content || news.title,
        source: incidentSource,
        timestamp: news.timestamp,
        location: locations[0] || { name: 'Bogotá' },
        coordinates: locations[0]?.coordinates || null,
        url: news.url || null
      });
    }

    // Procesar incidentes de Waze (siempre son relevantes para vista general)
    for (const wazeIncident of wazeIncidents) {
      allIncidents.push({
        id: wazeIncident.id,
        type: wazeIncident.type || classifyIncident(wazeIncident.description),
        title: wazeIncident.title || wazeIncident.description.substring(0, 100),
        description: wazeIncident.description,
        source: 'waze',
        timestamp: wazeIncident.timestamp,
        location: wazeIncident.location || null,
        coordinates: wazeIncident.coordinates || null,
        url: wazeIncident.url || null
      });
    }

    console.log(`📊 Resumen de procesamiento:
      - Tweets totales: ${tweets.length}
      - Tweets relevantes: ${tweetsRelevantes}
      - Tweets descartados: ${tweetsDescartados}
      - Incidentes creados de tweets: ${allIncidents.filter(i => i.source === 'twitter').length}
      - Incidentes de noticias (oficiales / SDM / prensa): ${allIncidents.filter((i) => i.source !== 'twitter' && i.source !== 'waze').length}
      - Incidentes de Waze: ${allIncidents.filter(i => i.source === 'waze').length}
      - Total incidentes antes de filtrar: ${allIncidents.length}`);

    // 4. Filtrar y priorizar incidentes
    const filteredIncidents = filterAndPrioritizeIncidents(allIncidents);
    
    console.log(`📊 Incidentes después de filtrar y priorizar: ${filteredIncidents.length}`);

    // 5. Guardar en cache general (guardar todos los filtrados, no solo 12)
    if (filteredIncidents.length > 0) {
      await saveGeneralMobilityCache(filteredIncidents);
      console.log(`✅ Cache general actualizado con ${filteredIncidents.length} incidentes`);
    } else {
      console.warn(`⚠️ No hay incidentes para guardar en cache después del filtrado`);
    }

    return {
      source: 'api',
      incidents: filteredIncidents,
      last_updated: new Date().toISOString(),
      isMock: isMock || false
    };
  } catch (error) {
    console.error('Error en getGeneralMobilityProblems:', error);
    throw error;
  }
}

/**
 * Filtra y prioriza incidentes, limitando a 12 más importantes
 * @param {Array} incidents - Array de incidentes
 * @returns {Array} Array filtrado y priorizado (máximo 12)
 */
function filterAndPrioritizeIncidents(incidents) {
  // 1. Descartar incidentes con más de MAX_AGE_DAYS de antigüedad
  const fresh = incidents.filter((incident) => !isIncidentTooOld(incident));
  const descartadosPorEdad = incidents.length - fresh.length;
  if (descartadosPorEdad > 0) {
    console.log(
      `⏰ ${descartadosPorEdad} incidentes descartados por antigüedad > ${FRESHNESS_THRESHOLDS.MAX_AGE_DAYS} días`
    );
  }

  // 2. Calcular prioridad para cada incidente
  const incidentsWithPriority = fresh.map((incident) => ({
    ...incident,
    priority: calculateIncidentPriority(incident),
  }));

  // 3. Filtrar solo los que tienen prioridad > 0 (excluir "otro" sin relevancia)
  const relevantIncidents = incidentsWithPriority.filter((incident) => incident.priority > 0);

  const descartadosPorPrioridad = incidentsWithPriority.length - relevantIncidents.length;
  if (descartadosPorPrioridad > 0) {
    console.log(`⚠️ ${descartadosPorPrioridad} incidentes descartados por tener prioridad 0 (tipo "otro" sin ubicación específica)`);
  }

  // 4. Ordenar por prioridad (mayor primero) y luego por timestamp (más reciente primero)
  const sorted = relevantIncidents.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  // 5. Limitar a 12 más importantes + anotar freshness
  const result = sorted.slice(0, 12).map(({ priority, ...incident }) => annotateIncidentFreshness(incident));

  if (sorted.length > 12) {
    console.log(`📊 Limitando a 12 incidentes más importantes (de ${sorted.length} incidentes relevantes)`);
  }

  return result;
}
