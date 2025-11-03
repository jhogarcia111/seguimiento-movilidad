import { getTweetsBySector } from './twitterService.js';
import { getBogotaGovUpdates } from './scrapingService.js';
import { extractLocations, classifyIncident } from './nlpService.js';
import { geocodeSector, calculateDistance } from './geocodingService.js';
import { getCachedIncidents, saveCachedIncidents } from '../database/incidents.js';

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
