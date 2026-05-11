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
  if (!text || typeof text !== 'string') return 'otro';
  
  const lowerText = text.toLowerCase();
  
  // Verificar que el texto realmente mencione el tipo de incidente en contexto
  // No solo buscar la palabra, sino verificar que esté en un contexto relevante
  
  // Manifestación: debe mencionar manifestación/protesta/marcha Y ubicación/movilidad
  if (lowerText.match(/(?:manifestaci[óo]n|protesta|marcha|bloqueo)/) && 
      (lowerText.match(/(?:en|calle|avenida|carrera|vía|movilidad|tráfico|transmilenio)/) || 
       lowerText.length < 200)) { // Si es texto corto, probablemente es un título/header
    return 'manifestación';
  }
  
  // Accidente: debe mencionar accidente/choque Y vehículo/tráfico
  if (lowerText.match(/(?:accidente|choque|colisi[óo]n|atropello|siniestro)/) &&
      lowerText.match(/(?:vehículo|auto|carro|moto|tráfico|vía|calle|avenida)/)) {
    return 'accidente';
  }
  
  // Obra: debe mencionar obra/mantenimiento Y vía/calle
  // EXCLUIR: convocatorias, arrendamientos, programas sociales, contrataciones
  if (lowerText.match(/(?:obra|rehabilitaci[óo]n|mantenimiento|construcci[óo]n)/) &&
      lowerText.match(/(?:vía|calle|avenida|carrera|carretera)/) &&
      !lowerText.match(/(?:convocatoria|arrendar|lote|subasta|secop|contrataci[óo]n|apoyos monetarios|ingreso mínimo|monitor social|así vamos)/i)) {
    return 'obra';
  }
  
  // Desvío: debe mencionar desvío/suspensión Y ruta/transmilenio
  if (lowerText.match(/(?:desv[ií]o|cancelaci[óo]n|suspensi[óo]n)/) &&
      lowerText.match(/(?:ruta|transmilenio|bus|estaci[óo]n|servicio)/)) {
    return 'desvío';
  }
  
  // Cierre: debe mencionar cierre Y vía/calle
  if (lowerText.match(/(?:cierre|cerrado|bloqueado)/) &&
      lowerText.match(/(?:vía|calle|avenida|carrera|carretera)/)) {
    return 'obra'; // Los cierres suelen ser por obras
  }
  
  return 'otro';
}
