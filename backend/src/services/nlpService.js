import nlp from 'compromise';

/**
 * Extrae ubicaciones mencionadas en un texto
 * @param {string} text - Texto a analizar
 * @returns {Array} Array de ubicaciones con coordenadas estimadas
 */
export function extractLocations(text) {
  const locations = [];
  
  // Patrones comunes de ubicaciones en Bogotá
  const locationPatterns = [
    // Avenidas principales
    /(?:av\.?|avenida)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)/gi,
    // Carreras y calles con números
    /(?:cra\.?|carrera|calle)\s+(\d+[a-z]?)/gi,
    // Intersecciones
    /(?:con|y)\s+((?:av\.?|avenida|cra\.?|carrera|calle)\s+[^\s]+)/gi,
    // Sectores conocidos
    /\b(centro|norte|sur|oriente|occidente|boyac[áa]|caracas|autonorte|autosur|nqs|septima|séptima|villavicencio)\b/gi
  ];

  // Extraer todas las menciones
  const mentions = new Set();
  
  for (const pattern of locationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      mentions.add(match[0].trim().toLowerCase());
    }
  }

  // Mapear a coordenadas conocidas (diccionario simplificado)
  const knownLocations = getKnownLocations();
  
  for (const mention of mentions) {
    const normalized = normalizeLocation(mention);
    const knownLoc = knownLocations.find(loc => 
      loc.aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))
    );
    
    if (knownLoc) {
      locations.push({
        name: mention,
        coordinates: knownLoc.coordinates,
        confidence: 0.8
      });
    }
  }

  return locations;
}

/**
 * Normaliza nombre de ubicación para comparación
 */
function normalizeLocation(location) {
  return location
    .toLowerCase()
    .replace(/av\.|avenida|cra\.|carrera|calle/gi, '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remover tildes
}

/**
 * Obtiene diccionario de ubicaciones conocidas de Bogotá
 */
function getKnownLocations() {
  return [
    {
      name: 'Avenida Boyacá',
      aliases: ['boyaca', 'boyacá', 'av boyaca', 'av boyacá', 'avenida boyaca'],
      coordinates: { lat: 4.6097, lng: -74.0817 } // Centro aproximado
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
      aliases: ['autonorte', 'autopista norte', 'nqs'],
      coordinates: { lat: 4.7000, lng: -74.0500 }
    },
    {
      name: 'Autopista Sur',
      aliases: ['autosur', 'autopista sur', 'av villavicencio'],
      coordinates: { lat: 4.5000, lng: -74.1000 }
    },
    {
      name: 'Carrera Séptima',
      aliases: ['septima', 'séptima', 'cra 7', 'carrera 7', 'carrera séptima'],
      coordinates: { lat: 4.6097, lng: -74.0717 }
    },
    {
      name: 'Carrera 30',
      aliases: ['cra 30', 'carrera 30'],
      coordinates: { lat: 4.6097, lng: -74.0837 }
    }
  ];
}

/**
 * Clasifica el tipo de incidente en el texto
 * @param {string} text - Texto a clasificar
 * @returns {string} Tipo de incidente
 */
export function classifyIncident(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.match(/(?:manifestaci[óo]n|protesta|marcha|bloqueo)/)) {
    return 'manifestación';
  }
  
  if (lowerText.match(/(?:accidente|choque|colisi[óo]n|atropello)/)) {
    return 'accidente';
  }
  
  if (lowerText.match(/(?:obra|cierre|rehabilitaci[óo]n|mantenimiento)/)) {
    return 'obra';
  }
  
  if (lowerText.match(/(?:desv[ií]o|cancelaci[óo]n|suspensi[óo]n)/)) {
    return 'desvío';
  }
  
  return 'otro';
}
