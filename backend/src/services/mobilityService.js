import { getTweetsBySector, getAllRecentTweets } from './twitterService.js';
import { getBogotaGovUpdates } from './scrapingService.js';
import { extractLocations, classifyIncident } from './nlpService.js';
import { geocodeSector, calculateDistance } from './geocodingService.js';
import { 
  getCachedIncidents, 
  saveCachedIncidents,
  getGeneralMobilityCache,
  shouldUpdateGeneralCache,
  saveGeneralMobilityCache
} from '../database/incidents.js';

/**
 * Obtiene problemas de movilidad para un sector específico
 * @param {string} sector - Nombre del sector (ej: "Avenida Boyacá")
 * @param {string|null} lat - Latitud opcional
 * @param {string|null} lng - Longitud opcional
 * @returns {Promise<Object>} Resultados filtrados por sector
 */
export async function getMobilityBySector(sector, lat = null, lng = null) {
  try {
    // 1. Geocodificar el sector si no hay coordenadas
    let coordinates = null;
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

    // 2. Buscar en cache primero
    const cachedResults = await getCachedIncidents(sector, coordinates);
    if (cachedResults && Array.isArray(cachedResults) && cachedResults.length > 0) {
      console.log(`✅ Usando cache para sector: ${sector}`);
      return {
        source: 'cache',
        incidents: cachedResults,
        coordinates: coordinates
      };
    }

    // 3. Consultar APIs externas
    console.log(`🔍 Consultando APIs para sector: ${sector}`);
    
    const [tweets, bogotaUpdates] = await Promise.all([
      getTweetsBySector(sector, coordinates),
      getBogotaGovUpdates()
    ]);

    // 4. Procesar y filtrar por sector
    const allIncidents = [];
    
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
              console.log(`❌ Tweet descartado: ${distance.toFixed(0)}m de distancia (>5km) - ubicación: ${loc.name || 'desconocida'}`);
            }
          }
        }
      } else {
        // Si no se extrajeron ubicaciones, verificar por texto
        const sectorLower = sector.toLowerCase();
        relevant = tweet.text.toLowerCase().includes(sectorLower);
        if (relevant) {
          console.log(`✅ Tweet relevante: coincidencia de texto (no se extrajo ubicación)`);
        }
      }

      if (relevant) {
        allIncidents.push({
          id: `tweet-${tweet.id}`,
          type: classifyIncident(tweet.text),
          title: tweet.text.substring(0, 100),
          description: tweet.text,
          source: 'twitter',
          sourceAccount: tweet.author_id,
          timestamp: tweet.created_at,
          location: locations[0],
          coordinates: locations[0]?.coordinates || null,
          url: `https://twitter.com/i/web/status/${tweet.id}`
        });
      }
    }

    // Procesar actualizaciones de bogota.gov.co
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
              console.log(`❌ Actualización descartada: ${distance.toFixed(0)}m de distancia (>5km) - ubicación: ${loc.name || 'desconocida'}`);
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

    // 5. Guardar en cache
    if (allIncidents.length > 0) {
      await saveCachedIncidents(sector, coordinates, allIncidents);
    }

    return {
      source: 'api',
      incidents: allIncidents,
      coordinates: coordinates
    };
  } catch (error) {
    console.error('Error en getMobilityBySector:', error);
    throw error;
  }
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
    /(?:accidente|choque|colisi[óo]n|atropello)/i,
    /(?:obra|rehabilitaci[óo]n|mantenimiento|cierre)/i,
    /(?:tr[áa]nsito|movilidad|veh[íi]culos|ruta|estaci[óo]n)/i,
    /(?:evita|recomendamos|precauci[óo]n|atenci[óo]n)/i
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
  
  // Si viene de bogota.gov.co, más confiable
  if (incident.source === 'bogota.gov.co') {
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
        return {
          source: 'cache',
          incidents: filtered,
          last_updated: cached.last_updated
        };
      }
    }

    // 2. Si necesita actualización, consultar APIs externas
    console.log(`🔍 Consultando APIs para problemas generales de movilidad...`);
    
    const [tweets, bogotaUpdates] = await Promise.all([
      getAllRecentTweets(),
      getBogotaGovUpdates()
    ]);

    // 3. Procesar y filtrar solo incidentes relevantes
    const allIncidents = [];
    
    // Procesar tweets
    for (const tweet of tweets) {
      // Verificar si es relevante antes de procesar
      if (!isRelevantMobilityAlert(tweet.text)) {
        console.log(`❌ Tweet descartado (no relevante): ${tweet.text.substring(0, 50)}...`);
        continue;
      }
      
      const locations = extractLocations(tweet.text);
      const incidentType = classifyIncident(tweet.text);
      
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
          url: `https://twitter.com/i/web/status/${tweet.id}`
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
          url: `https://twitter.com/i/web/status/${tweet.id}`
        });
      }
    }

    // Procesar actualizaciones de bogota.gov.co (siempre son relevantes)
    for (const update of bogotaUpdates) {
      const locations = extractLocations(update.content);
      const incidentType = classifyIncident(update.content);
      
      allIncidents.push({
        id: `bogota-${update.id}`,
        type: incidentType,
        title: update.title || update.content.substring(0, 100),
        description: update.content,
        source: 'bogota.gov.co',
        timestamp: update.timestamp,
        location: locations[0] || null,
        coordinates: locations[0]?.coordinates || null,
        url: update.url || null
      });
    }

    // 4. Filtrar y priorizar incidentes
    const filteredIncidents = filterAndPrioritizeIncidents(allIncidents);

    // 5. Guardar en cache general (guardar todos los filtrados, no solo 12)
    if (filteredIncidents.length > 0) {
      await saveGeneralMobilityCache(filteredIncidents);
    }

    return {
      source: 'api',
      incidents: filteredIncidents,
      last_updated: new Date().toISOString()
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
  // Calcular prioridad para cada incidente
  const incidentsWithPriority = incidents.map(incident => ({
    ...incident,
    priority: calculateIncidentPriority(incident)
  }));
  
  // Filtrar solo los que tienen prioridad > 0 (excluir "otro" sin relevancia)
  const relevantIncidents = incidentsWithPriority.filter(incident => incident.priority > 0);
  
  // Ordenar por prioridad (mayor primero) y luego por timestamp (más reciente primero)
  const sorted = relevantIncidents.sort((a, b) => {
    // Primero por prioridad
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    // Si tienen la misma prioridad, por timestamp
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeB - timeA;
  });
  
  // Limitar a 12 más importantes
  return sorted.slice(0, 12).map(({ priority, ...incident }) => incident); // Remover priority del resultado
}
