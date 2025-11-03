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
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      q: `${sector}, Bogotá, Colombia`,
      format: 'json',
      limit: 1
    },
    headers: {
      'User-Agent': 'SeguimientoMovilidad/1.0'
    }
  });

  if (response.data && response.data.length > 0) {
    const result = response.data[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    };
  }

  return null;
}

/**
 * Busca en diccionario de ubicaciones conocidas
 */
function findKnownLocation(sector) {
  const knownLocations = [
    {
      name: 'Avenida Boyacá',
      aliases: ['boyaca', 'boyacá', 'av boyaca', 'avenida boyaca', 'avenida boyacá'],
      coordinates: { lat: 4.6097, lng: -74.0817 }
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
      aliases: ['autonorte', 'autopista norte', 'nqs', 'nqs con'],
      coordinates: { lat: 4.7000, lng: -74.0500 }
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
