import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const USE_NOMINATIM = process.env.USE_NOMINATIM !== 'false'; // Por defecto usar Nominatim (gratis)

/**
 * Geocodifica un sector de Bogotá a coordenadas
 * @param {string} sector - Nombre del sector
 * @returns {Promise<Object|null>} Coordenadas { lat, lng } o null
 */
export async function geocodeSector(sector) {
  try {
    // Buscar en diccionario de ubicaciones conocidas primero
    const knownLoc = findKnownLocation(sector);
    if (knownLoc) {
      console.log(`✅ Ubicación conocida: ${sector} -> ${knownLoc.name}`);
      return knownLoc.coordinates;
    }

    // Si hay API key de Google Maps, usarla
    if (GOOGLE_MAPS_API_KEY && !USE_NOMINATIM) {
      return await geocodeWithGoogle(sector);
    }

    // Usar OpenStreetMap Nominatim (gratis)
    return await geocodeWithNominatim(sector);
  } catch (error) {
    console.error(`Error geocodificando ${sector}:`, error.message);
    return null;
  }
}

/**
 * Geocodifica usando Google Maps API
 */
async function geocodeWithGoogle(sector) {
  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: {
      address: `${sector}, Bogotá, Colombia`,
      key: GOOGLE_MAPS_API_KEY
    }
  });

  if (response.data.results && response.data.results.length > 0) {
    const location = response.data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng
    };
  }

  return null;
}

/**
 * Geocodifica usando OpenStreetMap Nominatim (gratis)
 */
async function geocodeWithNominatim(sector) {
  try {
    // Mejorar la búsqueda agregando contexto de Bogotá y Colombia
    const searchQuery = sector.toLowerCase().includes('bogota') || sector.toLowerCase().includes('bogotá')
      ? `${sector}, Colombia`
      : `${sector}, Bogotá, Colombia`;
    
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: searchQuery,
        format: 'json',
        limit: 5, // Obtener más resultados para poder filtrar mejor
        countrycodes: 'co', // Limitar a Colombia
        addressdetails: 1 // Obtener más detalles de la dirección
      },
      headers: {
        'User-Agent': 'SeguimientoMovilidad/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      // Filtrar resultados que mencionen "Bogotá" o "Bogota" en el display_name
      const bogotaResults = response.data.filter(result => 
        result.display_name && (
          result.display_name.toLowerCase().includes('bogotá') || 
          result.display_name.toLowerCase().includes('bogota')
        )
      );
      
      // Si hay resultados específicos de Bogotá, priorizar los que NO sean intersecciones específicas
      // (evitar "calle X con carrera Y" y preferir solo "calle X")
      if (bogotaResults.length > 0) {
        // Buscar resultados que NO mencionen "con" o "carrera" o "cra" (intersecciones específicas)
        const nonIntersectionResults = bogotaResults.filter(result => {
          const displayName = result.display_name.toLowerCase();
          return !displayName.includes(' con ') && 
                 !displayName.includes('carrera') && 
                 !displayName.includes('cra ') &&
                 !displayName.includes('carrera ');
        });
        
        // Si hay resultados que no son intersecciones específicas, usar el primero
        if (nonIntersectionResults.length > 0) {
          const result = nonIntersectionResults[0];
          console.log(`📍 Nominatim encontró: ${result.display_name} (sin intersección específica)`);
          return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
          };
        }
        
        // Si no hay resultados sin intersección, usar el primero de Bogotá
        const result = bogotaResults[0];
        console.log(`📍 Nominatim encontró: ${result.display_name} (intersección específica - usando como fallback)`);
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
      }
      
      // Si no hay resultados específicos de Bogotá, verificar que las coordenadas estén en Bogotá
      // Bogotá está aproximadamente entre lat: 4.4-4.8 y lng: -74.2 a -73.9
      const result = response.data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      // Verificar que esté en el rango de Bogotá
      if (lat >= 4.4 && lat <= 4.8 && lng >= -74.2 && lng <= -73.9) {
        console.log(`📍 Nominatim encontró: ${result.display_name} (dentro de Bogotá)`);
        return { lat, lng };
      } else {
        console.warn(`⚠️ Nominatim encontró resultado fuera de Bogotá: ${result.display_name} (${lat}, ${lng})`);
        // Si está fuera de Bogotá, usar coordenadas del centro de Bogotá como fallback
        console.log(`📍 Usando coordenadas del centro de Bogotá como fallback`);
        return { lat: 4.6097, lng: -74.0817 };
      }
    }

    return null;
  } catch (error) {
    console.error('Error en geocodificación Nominatim:', error.message);
    return null;
  }
}

/**
 * Busca en diccionario de ubicaciones conocidas
 */
function findKnownLocation(sector) {
  const knownLocations = [
    {
      name: 'Avenida Boyacá',
      aliases: ['boyaca', 'boyacá', 'av boyaca', 'av boyacá', 'avenida boyaca', 'avenida boyacá', 'av. boyaca', 'av. boyacá'],
      coordinates: { lat: 4.7000, lng: -74.0900 } // Coordenadas aproximadas del centro de Avenida Boyacá (norte-sur)
    },
    {
      name: 'Calle 72',
      aliases: ['calle 72', 'calle setenta y dos', '72'],
      coordinates: { lat: 4.6566, lng: -74.0596 }
    },
    {
      name: 'Avenida Caracas',
      aliases: ['caracas', 'av caracas', 'avenida caracas'],
      coordinates: { lat: 4.6100, lng: -74.0776 }
    },
    {
      name: 'Autopista Norte',
      aliases: ['autonorte', 'autopista norte', 'nqs', 'nqs con', 'autopista norte con', 'autonorte con'],
      coordinates: { lat: 4.6800, lng: -74.0700 } // Punto representativo de Autopista Norte (cerca de intersección con Avenida Caracas, más central que Suba)
    },
    {
      name: 'Autopista Sur',
      aliases: ['autosur', 'autopista sur', 'av villavicencio', 'villavicencio'],
      coordinates: { lat: 4.5000, lng: -74.1000 }
    },
    {
      name: 'Carrera Séptima',
      aliases: ['septima', 'séptima', 'cra 7', 'carrera 7'],
      coordinates: { lat: 4.6097, lng: -74.0717 }
    },
    {
      name: 'Carrera 30',
      aliases: ['cra 30', 'carrera 30'],
      coordinates: { lat: 4.6097, lng: -74.0837 }
    },
    {
      name: 'Carrera 79',
      aliases: ['cra 79', 'carrera 79'],
      coordinates: { lat: 4.5800, lng: -74.1200 }
    },
    {
      name: 'Centro Comercial Avenida Chile',
      aliases: ['centro comercial av chile', 'cc av chile', 'centro comercial avenida chile', 'av chile', 'avenida chile', 'cc avenida chile'],
      coordinates: { lat: 4.6277, lng: -74.0626 } // Aproximado - Centro comercial Av Chile
    },
    {
      name: 'Avenida Chile',
      aliases: ['av chile', 'avenida chile', 'chile'],
      coordinates: { lat: 4.6277, lng: -74.0626 }
    },
    {
      name: 'Calle 100',
      aliases: ['calle 100', 'calle ciento', '100'],
      coordinates: { lat: 4.6800, lng: -74.0500 }
    },
    {
      name: 'Calle 63',
      aliases: ['calle 63', 'calle sesenta y tres', '63'],
      coordinates: { lat: 4.6500, lng: -74.0700 }
    },
    {
      name: 'Transversal 30',
      aliases: ['transversal 30', 'transv 30', 'trans 30'],
      coordinates: { lat: 4.6100, lng: -74.0837 }
    },
    {
      name: 'Carrera 15',
      aliases: ['cra 15', 'carrera 15'],
      coordinates: { lat: 4.6300, lng: -74.0700 }
    },
    {
      name: 'Carrera 11',
      aliases: ['cra 11', 'carrera 11', 'carrera once'],
      coordinates: { lat: 4.6100, lng: -74.0750 }
    },
    {
      name: 'Calle 26',
      aliases: ['calle 26', 'calle veintiseis', 'calle veintiséis', '26'],
      coordinates: { lat: 4.6097, lng: -74.0817 } // Centro de Bogotá, Calle 26 (aproximado)
    },
    {
      name: 'Calle 80',
      aliases: ['calle 80', 'calle ochenta', '80'],
      coordinates: { lat: 4.6654, lng: -74.0776 } // Punto representativo de Calle 80 cerca de Avenida Caracas (más representativo que calle 80 con cra 11)
    }
  ];

  const normalized = sector.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const loc of knownLocations) {
    if (loc.aliases.some(alias => normalized.includes(alias) || normalized.includes(alias.replace(/[áéíóú]/g, '')))) {
      return loc;
    }
  }

  return null;
}

/**
 * Calcula distancia entre dos puntos en metros (fórmula de Haversine)
 * @param {Object} point1 - { lat, lng }
 * @param {Object} point2 - { lat, lng }
 * @returns {number} Distancia en metros
 */
export function calculateDistance(point1, point2) {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(point1.lat * Math.PI / 180) *
            Math.cos(point2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}
