/**
 * Extrae solo la sección relevante de una noticia basándose en una ubicación específica
 * @param {string} content - Contenido completo de la noticia
 * @param {string} locationName - Nombre de la ubicación a buscar
 * @param {string} incidentType - Tipo de incidente (manifestación, obra, etc.)
 * @returns {string} Sección relevante del contenido
 */
export function extractRelevantSection(content, locationName, incidentType = 'otro') {
  if (!content || !locationName) {
    return content || '';
  }

  const lowerContent = content.toLowerCase();
  const lowerLocation = locationName.toLowerCase();
  
  // Normalizar nombres de ubicación para búsqueda
  const locationVariations = [
    lowerLocation,
    lowerLocation.replace(/av\.|avenida/gi, ''),
    lowerLocation.replace(/calle/gi, ''),
    lowerLocation.replace(/carrera|cra\./gi, ''),
  ].filter(v => v.trim().length > 2);

  // Buscar la sección que menciona la ubicación específica
  // Buscar patrones como "en [ubicación]", "en la [ubicación]", "[ubicación] y", etc.
  const locationPatterns = [
    new RegExp(`(?:en|en la|en el|sobre|en las inmediaciones de|en la zona de)\\s+${escapeRegex(lowerLocation)}[^.]*(?:\\.|$)`, 'gi'),
    new RegExp(`${escapeRegex(lowerLocation)}[^.]*(?:manifestaci[óo]n|protesta|marcha|bloqueo|obra|mantenimiento|rehabilitaci[óo]n|construcci[óo]n|cierre|desv[ií]o|accidente|choque)[^.]*(?:\\.|$)`, 'gi'),
  ];

  // Agregar variaciones de ubicación
  for (const variation of locationVariations) {
    if (variation.length > 3) {
      locationPatterns.push(
        new RegExp(`(?:en|en la|en el|sobre)\\s+${escapeRegex(variation)}[^.]*(?:\\.|$)`, 'gi'),
        new RegExp(`${escapeRegex(variation)}[^.]*(?:manifestaci[óo]n|protesta|marcha|bloqueo|obra|mantenimiento|rehabilitaci[óo]n|construcci[óo]n|cierre|desv[ií]o|accidente|choque)[^.]*(?:\\.|$)`, 'gi')
      );
    }
  }

  // Buscar la primera coincidencia relevante
  let bestMatch = null;
  let bestMatchIndex = -1;
  let bestMatchLength = 0;

  for (const pattern of locationPatterns) {
    const matches = Array.from(content.matchAll(pattern));
    for (const match of matches) {
      const matchText = match[0];
      const matchIndex = match.index;
      
      // Verificar que la coincidencia sea relevante al tipo de incidente
      const isRelevant = checkRelevance(matchText, incidentType);
      
      if (isRelevant && matchText.length > bestMatchLength) {
        bestMatch = matchText;
        bestMatchIndex = matchIndex;
        bestMatchLength = matchText.length;
      }
    }
  }

  // Si encontramos una sección relevante, extraer contexto alrededor
  if (bestMatch && bestMatchIndex >= 0) {
    // Extraer contexto: desde 200 caracteres antes hasta 300 caracteres después
    const contextStart = Math.max(0, bestMatchIndex - 200);
    const contextEnd = Math.min(content.length, bestMatchIndex + bestMatchLength + 300);
    const relevantSection = content.substring(contextStart, contextEnd).trim();
    
    // Limpiar la sección: remover contenido no relevante
    const cleaned = cleanSection(relevantSection, incidentType);
    
    // Si la sección limpia es muy corta, intentar obtener más contexto
    if (cleaned.length < 100) {
      const extendedStart = Math.max(0, bestMatchIndex - 400);
      const extendedEnd = Math.min(content.length, bestMatchIndex + bestMatchLength + 500);
      const extendedSection = content.substring(extendedStart, extendedEnd).trim();
      return cleanSection(extendedSection, incidentType);
    }
    
    return cleaned;
  }

  // Si no encontramos una sección específica, buscar párrafos que mencionen la ubicación
  const paragraphs = content.split(/\n\n|\.\s+/).filter(p => p.trim().length > 20);
  const relevantParagraphs = [];

  for (const para of paragraphs) {
    const paraLower = para.toLowerCase();
    const mentionsLocation = locationVariations.some(variation => 
      paraLower.includes(variation) && variation.length > 3
    );
    
    if (mentionsLocation && checkRelevance(para, incidentType)) {
      relevantParagraphs.push(para.trim());
    }
  }

  if (relevantParagraphs.length > 0) {
    const combined = relevantParagraphs.join('. ').trim();
    return cleanSection(combined, incidentType);
  }

  // Si no encontramos nada específico, retornar el contenido original pero limpio
  return cleanSection(content, incidentType);
}

/**
 * Verifica si un texto es relevante al tipo de incidente
 */
function checkRelevance(text, incidentType) {
  const lowerText = text.toLowerCase();
  
  // Filtrar contenido no relevante
  const irrelevantPatterns = [
    /así vamos/i,
    /apoyos monetarios/i,
    /ingreso mínimo garantizado/i,
    /monitor social/i,
    /contrataci[óo]n/i,
    /arrendar|lote|subasta|secop/i,
    /síguenos en|google noticias|whatsapp/i,
    /publicado por|foto:|@/i,
    /entérate sobre|conoce|aquí encontrarás/i,
  ];

  for (const pattern of irrelevantPatterns) {
    if (pattern.test(text)) {
      return false;
    }
  }

  // Verificar relevancia según el tipo de incidente
  switch (incidentType) {
    case 'manifestación':
      return /manifestaci[óo]n|protesta|marcha|bloqueo/i.test(text);
    case 'obra':
      return /obra|mantenimiento|rehabilitaci[óo]n|construcci[óo]n|cierre.*vía|cierre.*calle/i.test(text) &&
             !/contrataci[óo]n|arrendar|lote|subasta|secop|apoyos monetarios/i.test(text);
    case 'accidente':
      return /accidente|choque|colisi[óo]n|atropello|siniestro/i.test(text);
    case 'desvío':
      return /desv[ií]o|cancelaci[óo]n|suspensi[óo]n.*ruta|suspensi[óo]n.*transmilenio/i.test(text);
    default:
      return true;
  }
}

/**
 * Limpia una sección de contenido no relevante
 */
function cleanSection(section, incidentType) {
  if (!section) return '';

  let cleaned = section;

  // Remover secciones no relevantes
  const irrelevantSections = [
    /Así Vamos[^.]*/gi,
    /Aquí encontrarás noticias de cómo se están invirtiendo[^.]*/gi,
    /apoyos monetarios de Ingreso Mínimo Garantizado[^.]*/gi,
    /Monitor Social[^.]*/gi,
    /Seguimiento a las obras[^.]*/gi,
    /Mantenimiento vial[^.]*/gi,
    /Inversión social[^.]*/gi,
    /Contratación a la vista[^.]*/gi,
    /Síguenos en Google Noticias[^.]*/gi,
    /Únete a nuestro canal[^.]*/gi,
    /Publicado por:[^.]*/gi,
    /Foto:[^.]*/gi,
    /@[^\s]+/g,
    /Entérate sobre[^.]*/gi,
    /Conoce[^.]*/gi,
  ];

  for (const pattern of irrelevantSections) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remover HTML, JSON, y código
  cleaned = cleaned
    .replace(/<[^>]+>/g, '') // Remover tags HTML
    .replace(/\{[^}]+\}/g, '') // Remover objetos JSON simples
    .replace(/console\.log\([^)]+\)/g, '') // Remover console.log
    .replace(/#theme|#title|#label_display|#items|#formatter|#type|#text|#is_multiple/g, '') // Remover campos de Drupal
    .replace(/["']/g, '') // Remover comillas
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();

  // Si después de limpiar es muy corto, retornar vacío
  if (cleaned.length < 30) {
    return '';
  }

  return cleaned;
}

/**
 * Escapa caracteres especiales para regex
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

