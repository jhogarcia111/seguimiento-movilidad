import { launchBrowser } from '../puppeteer.js';
import { getCachedWazeIncidents, saveCachedWazeIncidents } from '../db/incidents.js';

/**
 * PENDIENTE: reactivar cuando haya una vía fiable (API partner, scraping estable o entorno con Puppeteer).
 * Mientras esté en false no se consulta caché ni se carga Puppeteer.
 */
export const WAZE_ENABLED = false;

const WAZE_LIVE_MAP_URL = 'https://www.waze.com/live-map';
const CACHE_DURATION_MINUTES = 30; // Cache de 30 minutos para Waze

/**
 * Obtiene incidentes de tráfico de Waze Live Map para Bogotá
 * @param {Object} coordinates - Coordenadas { lat, lng } del área a buscar
 * @param {number} radius - Radio en metros (por defecto 5000m = 5km)
 * @returns {Promise<Array>} Array de incidentes de Waze
 */
export async function getWazeIncidents(coordinates = null, radius = 5000) {
  if (!WAZE_ENABLED) {
    return [];
  }

  try {
    // Si no hay coordenadas, usar coordenadas de Bogotá por defecto
    const searchCoordinates = coordinates || { lat: 4.6097, lng: -74.0817 }; // Centro de Bogotá
    
    // Verificar cache primero
    const cached = await getCachedWazeIncidents(searchCoordinates, radius);
    if (cached && isCacheValid(cached.timestamp)) {
      console.log(`✅ Usando cache de Waze (${cached.incidents.length} incidentes)`);
      return cached.incidents;
    }

    console.log(`🔍 Scrapeando Waze Live Map para Bogotá...`);
    console.log(`📍 Coordenadas: ${searchCoordinates.lat}, ${searchCoordinates.lng}, Radio: ${radius}m`);
    
    // Usar Puppeteer para renderizar JavaScript
    const incidents = await scrapeWazeWithPuppeteer(searchCoordinates, radius);
    
    // Guardar en cache
    if (incidents.length > 0) {
      await saveCachedWazeIncidents(searchCoordinates, radius, incidents);
    }
    
    console.log(`✅ Obtenidos ${incidents.length} incidentes de Waze`);
    return incidents;
  } catch (error) {
    console.error('❌ Error obteniendo incidentes de Waze:', error.message);
    
    // Intentar usar cache aunque esté expirado
    const staleCache = await getCachedWazeIncidents(coordinates || { lat: 4.6097, lng: -74.0817 }, radius);
    if (staleCache) {
      console.log('⚠️ Usando cache expirado de Waze debido a error');
      return staleCache.incidents;
    }
    
    return [];
  }
}

/**
 * Scrapea incidentes de Waze usando Puppeteer
 * @param {Object} coordinates - Coordenadas { lat, lng }
 * @param {number} radius - Radio en metros
 * @returns {Promise<Array>} Array de incidentes
 */
async function scrapeWazeWithPuppeteer(coordinates, radius) {
  let browser = null;

  try {
    console.log(`🌐 Iniciando navegador headless para Waze Live Map...`);

    browser = await launchBrowser();

    const page = await browser.newPage();
    
    // Configurar user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Ocultar que es Puppeteer
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
    
    // Navegar a Waze Live Map
    const url = `${WAZE_LIVE_MAP_URL}?lat=${coordinates.lat}&lon=${coordinates.lng}&zoom=13`;
    console.log(`🌐 Navegando a: ${url}`);
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle0', // Esperar a que la red esté inactiva (carga completa)
        timeout: 30000 // Aumentado a 30 segundos para dar tiempo a cargar
      });
    } catch (error) {
      if (error.message.includes('timeout')) {
        console.log(`⏱️ Timeout navegando a Waze (30s), continuando con datos disponibles...`);
        // No lanzar error, continuar con lo que se haya cargado
      } else {
        console.error(`❌ Error navegando a Waze: ${error.message}`);
        throw error;
      }
    }
    
    // Esperar a que se cargue el mapa y los incidentes
    console.log(`⏳ Esperando a que se cargue el mapa de Waze...`);
    await new Promise(resolve => setTimeout(resolve, 10000)); // Aumentado a 10 segundos para que cargue completamente
    
    // Intentar hacer zoom out para ver más incidentes
    try {
      await page.evaluate(() => {
        // Intentar hacer zoom out
        const mapContainer = document.querySelector('.map-container, #map, .leaflet-container, [class*="map"]');
        if (mapContainer) {
          // Simular scroll para hacer zoom out
          const wheelEvent = new WheelEvent('wheel', {
            deltaY: 100,
            bubbles: true
          });
          mapContainer.dispatchEvent(wheelEvent);
        }
      });
      await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar después del zoom
    } catch (error) {
      console.log(`⚠️ No se pudo hacer zoom out: ${error.message}`);
    }
    
    // Intentar esperar a que aparezcan los incidentes con múltiples selectores
    const selectorsToTry = [
      '.waze-incident',
      '.incident-marker',
      '[data-incident]',
      '.traffic-incident',
      '.alert-marker',
      '[class*="incident"]',
      '[class*="alert"]',
      '[class*="traffic"]',
      '[class*="jam"]',
      '[class*="accident"]',
      '.map-marker',
      '[role="button"]'
    ];
    
    let foundSelector = false;
    for (const selector of selectorsToTry) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        console.log(`✅ Encontrado selector: ${selector}`);
        foundSelector = true;
        break;
      } catch (error) {
        // Continuar con siguiente selector
      }
    }
    
    if (!foundSelector) {
      console.log(`⚠️ No se encontraron selectores estándar de incidentes, continuando con búsqueda general...`);
    }
    
    // Extraer incidentes del mapa
    const rawData = await page.evaluate((coords, rad) => {
      const incidents = [];
      
      // Intentar múltiples métodos para encontrar incidentes
      // Waze puede usar diferentes estructuras HTML
      
      // Método 1: Buscar elementos con clases relacionadas a incidentes
      const incidentSelectors = [
        '.waze-incident',
        '.incident-marker',
        '[data-incident]',
        '.traffic-incident',
        '.alert-marker',
        '[class*="incident"]',
        '[class*="alert"]',
        '[class*="traffic"]'
      ];
      
      let foundElements = [];
      
      for (const selector of incidentSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundElements = Array.from(elements);
            console.log(`✅ Encontrados ${elements.length} elementos con selector "${selector}"`);
            break;
          }
        } catch (e) {
          // Continuar con siguiente selector
        }
      }
      
      // Método 2: Buscar en el DOM por texto que indique incidentes
      if (foundElements.length === 0) {
        const allElements = document.querySelectorAll('div, span, a');
        foundElements = Array.from(allElements).filter(el => {
          const text = el.textContent || '';
          const hasIncidentKeywords = /accidente|obra|tráfico|cerrado|desvío|congestión|incidente/i.test(text);
          const hasLocation = /av\.|avenida|calle|carrera|transversal|autopista|norte|sur|occidente|oriente/i.test(text);
          return hasIncidentKeywords && hasLocation && text.length > 20 && text.length < 500;
        });
      }
      
      // Método 3: Buscar en el contenido del mapa (si está disponible)
      let mapIncidentsData = null;
      
      // Intentar acceder a datos del mapa desde múltiples ubicaciones posibles
      const possibleDataPaths = [
        () => window.waze?.map?.incidents,
        () => window.waze?.map?.data?.incidents,
        () => window.map?.incidents,
        () => window.map?.data?.incidents,
        () => window.__INITIAL_STATE__?.map?.incidents,
        () => window.__INITIAL_STATE__?.map?.data?.incidents,
        () => window.__WML?.map?.incidents,
        () => window.__WML?.map?.data?.incidents,
        () => window.app?.map?.incidents,
        () => window.app?.map?.data?.incidents,
        () => {
          // Buscar en todos los objetos globales
          for (const key in window) {
            try {
              if (window[key]?.map?.incidents) return window[key].map.incidents;
              if (window[key]?.map?.data?.incidents) return window[key].map.data.incidents;
            } catch (e) {}
          }
          return null;
        }
      ];
      
      for (const getData of possibleDataPaths) {
        try {
          const data = getData();
          if (data && Array.isArray(data) && data.length > 0) {
            mapIncidentsData = data;
            console.log(`✅ Encontrados ${data.length} incidentes en datos del mapa`);
            break;
          }
        } catch (e) {
          // Continuar con siguiente path
        }
      }
      
      // Si no encontramos en window, buscar en el DOM por atributos data-*
      if (!mapIncidentsData) {
        const dataElements = document.querySelectorAll('[data-incident], [data-jam], [data-accident], [data-alert]');
        if (dataElements.length > 0) {
          console.log(`✅ Encontrados ${dataElements.length} elementos con atributos data-*`);
          foundElements = Array.from(dataElements);
        }
      }
      
      // Procesar elementos encontrados
      const rawIncidents = [];
      for (let i = 0; i < Math.min(foundElements.length, 50); i++) {
        const element = foundElements[i];
        const text = element.textContent?.trim() || '';
        
        if (!text || text.length < 10) continue;
        
        // Extraer coordenadas si están disponibles en atributos
        let lat = coords.lat;
        let lng = coords.lng;
        
        const dataLat = element.getAttribute('data-lat') || element.getAttribute('lat');
        const dataLng = element.getAttribute('data-lng') || element.getAttribute('lng');
        
        if (dataLat && dataLng) {
          lat = parseFloat(dataLat);
          lng = parseFloat(dataLng);
        }
        
        rawIncidents.push({
          text: text,
          lat: lat,
          lng: lng
        });
      }
      
      // Retornar datos crudos para procesar fuera del contexto del navegador
      return {
        rawIncidents: rawIncidents,
        mapIncidents: mapIncidentsData
      };
    }, coordinates, radius);
    
    // Procesar datos crudos fuera del contexto del navegador
    const incidents = [];
    
    // Procesar incidentes de elementos HTML
    if (rawData.rawIncidents && Array.isArray(rawData.rawIncidents)) {
      for (const rawIncident of rawData.rawIncidents) {
        const distance = calculateDistance(coordinates.lat, coordinates.lng, rawIncident.lat, rawIncident.lng);
        
        if (distance <= radius) {
          incidents.push({
            id: `waze-${Date.now()}-${Math.random()}`,
            type: extractIncidentType(rawIncident.text),
            title: rawIncident.text.substring(0, 100),
            description: rawIncident.text,
            location: extractLocation(rawIncident.text) || { name: 'Bogotá' },
            coordinates: { lat: rawIncident.lat, lng: rawIncident.lng },
            timestamp: new Date().toISOString(),
            source: 'waze',
            url: `https://www.waze.com/live-map?lat=${rawIncident.lat}&lon=${rawIncident.lng}`
          });
        }
      }
    }
    
    // Procesar incidentes del mapa (si están disponibles)
    if (rawData.mapIncidents && Array.isArray(rawData.mapIncidents)) {
      console.log(`✅ Encontrados ${rawData.mapIncidents.length} incidentes en datos del mapa de Waze`);
      
      for (const incident of rawData.mapIncidents) {
        if (!incident.lat || !incident.lng) continue;
        
        const distance = calculateDistance(coordinates.lat, coordinates.lng, incident.lat, incident.lng);
        
        if (distance <= radius) {
          incidents.push({
            id: `waze-${incident.id || Date.now()}-${Math.random()}`,
            type: mapIncidentType(incident.type),
            title: incident.title || incident.description || 'Incidente de tráfico',
            description: incident.description || incident.title || '',
            location: {
              name: incident.location || 'Bogotá',
              coordinates: {
                lat: incident.lat,
                lng: incident.lng
              }
            },
            coordinates: {
              lat: incident.lat,
              lng: incident.lng
            },
            timestamp: new Date(incident.timestamp || Date.now()).toISOString(),
            source: 'waze',
            url: `https://www.waze.com/live-map?lat=${incident.lat}&lon=${incident.lng}`
          });
        }
      }
    }
    
    console.log(`✅ Puppeteer extrajo ${incidents.length} incidentes de Waze`);
    
    return incidents;
  } catch (error) {
    console.error(`❌ Error usando Puppeteer para Waze:`, error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Extrae el tipo de incidente del texto
 * @param {string} text - Texto del incidente
 * @returns {string} Tipo de incidente
 */
function extractIncidentType(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.match(/(?:accidente|choque|colisi[óo]n|atropello|siniestro)/)) {
    return 'accidente';
  }
  if (lowerText.match(/(?:obra|construcci[óo]n|mantenimiento|cierre)/)) {
    return 'obra';
  }
  if (lowerText.match(/(?:manifestaci[óo]n|protesta|marcha)/)) {
    return 'manifestación';
  }
  if (lowerText.match(/(?:desv[íi]o|alterna|ruta)/)) {
    return 'desvío';
  }
  if (lowerText.match(/(?:tráfico|congesti[óo]n|lento|denso)/)) {
    return 'tráfico';
  }
  
  return 'otro';
}

/**
 * Extrae ubicación del texto
 * @param {string} text - Texto del incidente
 * @returns {Object|null} Ubicación { name: string }
 */
function extractLocation(text) {
  // Patrones comunes de ubicaciones en Bogotá
  const locationPatterns = [
    /(?:av\.|avenida)\s+([A-Za-zÁÉÍÓÚáéíóú\s]+)/i,
    /(?:calle|cra\.|carrera)\s+(\d+)/i,
    /(?:transversal|diagonal)\s+(\d+)/i,
    /(?:autopista)\s+([A-Za-zÁÉÍÓÚáéíóú\s]+)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return { name: match[0].trim() };
    }
  }
  
  return null;
}

/**
 * Calcula distancia entre dos puntos (fórmula Haversine)
 * @param {number} lat1 - Latitud punto 1
 * @param {number} lon1 - Longitud punto 1
 * @param {number} lat2 - Latitud punto 2
 * @param {number} lon2 - Longitud punto 2
 * @returns {number} Distancia en metros
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Mapea tipo de incidente de Waze a nuestro formato
 * @param {string} wazeType - Tipo de incidente de Waze
 * @returns {string} Tipo de incidente normalizado
 */
function mapIncidentType(wazeType) {
  const typeMap = {
    'ACCIDENT': 'accidente',
    'HAZARD': 'otro',
    'JAM': 'tráfico',
    'ROAD_CLOSED': 'obra',
    'CONSTRUCTION': 'obra',
    'POLICE': 'otro',
    'WEATHERHAZARD': 'otro'
  };
  
  return typeMap[wazeType] || 'otro';
}

/**
 * Verifica si el cache es válido
 * @param {string} cacheTimestamp - Timestamp del cache
 * @returns {boolean} true si el cache es válido
 */
function isCacheValid(cacheTimestamp) {
  const cacheAge = (Date.now() - new Date(cacheTimestamp).getTime()) / 1000 / 60;
  return cacheAge < CACHE_DURATION_MINUTES;
}

