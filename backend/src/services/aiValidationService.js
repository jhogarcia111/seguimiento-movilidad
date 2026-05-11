import axios from 'axios';
import { getConfig } from './configService.js';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Valida un título de blogpost para determinar si está relacionado con la búsqueda del usuario
 * @param {string} title - Título del blogpost
 * @param {string} userQuery - Búsqueda del usuario (sector/vía)
 * @returns {Promise<Object>} Resultado con calificación (1-10) y análisis
 */
export async function validateBlogpostTitle(title, userQuery) {
  try {
    const apiKey = await getConfig('deepseek_api_key', null);
    
    // Log detallado para debug
    if (apiKey) {
      const keyLength = apiKey.length;
      const keyPreview = apiKey.substring(0, 10);
      const keySuffix = apiKey.substring(keyLength - 4);
      console.log(`✅ DeepSeek API KEY encontrada (${keyPreview}...${keySuffix}, longitud: ${keyLength})`);
      
      // Verificar que la key tiene el formato esperado (empieza con "sk-")
      if (!apiKey.startsWith('sk-')) {
        console.warn(`⚠️ La API KEY no tiene el formato esperado (debería empezar con "sk-")`);
      }
    } else {
      console.log('⚠️ DeepSeek API KEY no configurada - saltando validación de título');
      console.log('   💡 Verifica que la API KEY esté guardada en la tabla system_config con config_key="deepseek_api_key"');
      console.log('   💡 Ejecuta esta consulta SQL para verificar:');
      console.log('      SELECT config_key, LENGTH(config_value) as length, LEFT(config_value, 20) as preview FROM system_config WHERE config_key = "deepseek_api_key"');
    }
    
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        score: 5, // Calificación neutral si no hay API KEY
        isRelevant: true,
        reason: 'API KEY no configurada'
      };
    }

    const prompt = `Eres un experto en análisis de títulos de artículos de movilidad urbana en Bogotá, Colombia.

TÍTULO DEL ARTÍCULO: "${title}"
BÚSQUEDA DEL USUARIO: "${userQuery}"

Tu tarea es calificar del 1 al 10 qué tan relacionado está el título del artículo con la búsqueda del usuario.

CRITERIOS:
- 1-3: El artículo NO tiene nada que ver con movilidad o con la búsqueda del usuario (ej: licitaciones, programas sociales, anuncios generales)
- 4-6: El artículo puede tener algo que ver con movilidad pero NO está relacionado con la búsqueda del usuario
- 7-8: El artículo está relacionado con movilidad Y puede estar relacionado con la búsqueda del usuario
- 9-10: El artículo está MUY relacionado con movilidad Y está directamente relacionado con la búsqueda del usuario

IMPORTANTE: Considera variaciones de nombres y lugares:
- "autonorte" = "autopista norte" = "nqs"
- "calle 80" = "Calle 80"
- "el campín" = "campín" = "estadio el campín" = "estadio nemesio camacho el campín"
- "movistar arena" = "arena" (cerca de El Campín)
- Si el título menciona un lugar cercano o relacionado con la búsqueda, también es relevante

EJEMPLOS:
- Si el usuario busca "el campín" y el título menciona "concierto en El Campín" o "Estadio Nemesio Camacho" → Calificación 9-10
- Si el usuario busca "el campín" y el título menciona "Movistar Arena" (cerca de El Campín) → Calificación 7-8
- Si el usuario busca "el campín" y el título menciona "conciertos" o "eventos" en Bogotá → Calificación 6-7

Responde SOLO en formato JSON válido (sin texto adicional):
{
  "score": 1-10,
  "isRelevant": true/false,
  "reason": "Explicación breve (máximo 50 caracteres)"
}`;

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis de títulos de artículos de movilidad urbana en Bogotá, Colombia. Responde siempre en formato JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const aiResponse = response.data.choices[0]?.message?.content || '';
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.max(1, Math.min(10, parsed.score || 5)),
        isRelevant: parsed.isRelevant !== false && (parsed.score || 5) >= 7,
        reason: parsed.reason || 'Análisis completado'
      };
    }
    
    return {
      score: 5,
      isRelevant: true,
      reason: 'Error parseando respuesta'
    };
    
  } catch (error) {
    console.error('❌ Error validando título con IA:', error.message);
    return {
      score: 5,
      isRelevant: true,
      reason: `Error: ${error.message}`
    };
  }
}

/**
 * Valida si un artículo del día anterior es temporalmente relevante para hoy
 * Usa DeepSeek para analizar el título y determinar si menciona eventos del fin de semana o días futuros
 * @param {string} title - Título del artículo
 * @param {Date} articleDate - Fecha de publicación del artículo
 * @param {Date} today - Fecha de hoy
 * @returns {Promise<Object>} Resultado con isTemporallyRelevant y reason
 */
export async function validateTemporalRelevance(title, articleDate, today) {
  try {
    const apiKey = await getConfig('deepseek_api_key', null);
    
    if (!apiKey || apiKey.trim().length === 0) {
      // Si no hay API KEY, usar heurística simple
      const titleLower = title.toLowerCase();
      const temporalKeywords = ['fin de semana', 'sábado', 'sabado', 'domingo', 'hoy', 'mañana'];
      const hasTemporalKeywords = temporalKeywords.some(keyword => titleLower.includes(keyword));
      return {
        isTemporallyRelevant: hasTemporalKeywords,
        reason: hasTemporalKeywords ? 'Tiene palabras clave temporales' : 'No tiene palabras clave temporales'
      };
    }
    
    // Obtener día de la semana de hoy
    const todayDayName = today.toLocaleDateString('es-CO', { weekday: 'long' });
    const todayDateStr = today.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    const articleDateStr = articleDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const prompt = `Eres un experto en análisis temporal de artículos de movilidad urbana en Bogotá, Colombia.

TÍTULO DEL ARTÍCULO: "${title}"
FECHA DE PUBLICACIÓN DEL ARTÍCULO: ${articleDateStr}
FECHA DE HOY: ${todayDateStr} (${todayDayName})

Tu tarea es determinar si el artículo menciona eventos o cierres de vías que son relevantes para HOY, aunque haya sido publicado ayer.

CRITERIOS:
- Si el título menciona "fin de semana", "sábado y domingo", "domingo", o fechas específicas que incluyen HOY → Es temporalmente relevante
- Si el título menciona eventos o cierres que ocurren HOY → Es temporalmente relevante
- Si el título solo menciona eventos pasados o futuros lejanos → NO es temporalmente relevante

EJEMPLOS:
- Título: "Fin de semana de eventos de alto impacto en Bogotá" (publicado ayer, hoy es domingo) → Es temporalmente relevante
- Título: "Carrera atlética el domingo" (publicado ayer, hoy es domingo) → Es temporalmente relevante
- Título: "Cierres de vías para el próximo fin de semana" (publicado ayer, hoy es domingo) → NO es temporalmente relevante (es para el próximo fin de semana)
- Título: "Eventos del sábado pasado" (publicado ayer, hoy es domingo) → NO es temporalmente relevante (es del pasado)

IMPORTANTE: Considera el contexto temporal. Si hoy es DOMINGO y el artículo menciona "fin de semana" o "domingo", es muy probable que sea relevante para HOY.

Responde SOLO en formato JSON válido (sin texto adicional):
{
  "isTemporallyRelevant": true/false,
  "reason": "Explicación breve (máximo 100 caracteres)"
}`;

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis temporal de artículos de movilidad urbana en Bogotá, Colombia. Responde siempre en formato JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const aiResponse = response.data.choices[0]?.message?.content || '';
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isTemporallyRelevant: parsed.isTemporallyRelevant === true,
        reason: parsed.reason || 'Análisis completado'
      };
    }
    
    return {
      isTemporallyRelevant: false,
      reason: 'Error parseando respuesta'
    };
    
  } catch (error) {
    console.error('❌ Error validando relevancia temporal con IA:', error.message);
    // Si hay error, usar heurística simple
    const titleLower = title.toLowerCase();
    const temporalKeywords = ['fin de semana', 'sábado', 'sabado', 'domingo', 'hoy', 'mañana'];
    const hasTemporalKeywords = temporalKeywords.some(keyword => titleLower.includes(keyword));
    return {
      isTemporallyRelevant: hasTemporalKeywords,
      reason: `Error: ${error.message}`
    };
  }
}

/**
 * Valida y analiza un reporte de movilidad usando DeepSeek AI
 * @param {Object} report - Reporte a validar
 * @param {string} userQuery - Búsqueda del usuario (sector/vía)
 * @returns {Promise<Object>} Resultado de la validación con análisis
 */
export async function validateMobilityReport(report, userQuery = null) {
  try {
    // Obtener API KEY de DeepSeek desde configuración
    const apiKey = await getConfig('deepseek_api_key', null);
    
    // Log detallado para debug
    if (!apiKey || apiKey.trim().length === 0) {
      console.log('⚠️ DeepSeek API KEY no configurada - saltando validación de IA');
      console.log('   💡 Verifica que la API KEY esté guardada en la tabla system_config con config_key="deepseek_api_key"');
      console.log('   💡 Ejecuta esta consulta SQL para verificar:');
      console.log('      SELECT config_key, LENGTH(config_value) as length, LEFT(config_value, 20) as preview FROM system_config WHERE config_key = "deepseek_api_key"');
    } else {
      const keyLength = apiKey.length;
      const keyPreview = apiKey.substring(0, 10);
      const keySuffix = apiKey.substring(keyLength - 4);
      console.log(`✅ DeepSeek API KEY encontrada (${keyPreview}...${keySuffix}, longitud: ${keyLength})`);
    }
    
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        isValid: true, // Por defecto, si no hay API KEY, considerar válido
        confidence: 0.5,
        analysis: null,
        reason: 'API KEY no configurada'
      };
    }

    // Construir prompt para DeepSeek
    const prompt = buildValidationPrompt(report, userQuery);
    
    // Llamar a DeepSeek API
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis de reportes de movilidad urbana en Bogotá, Colombia. Tu tarea es analizar reportes y determinar si son incidentes reales de movilidad que pueden afectar el tránsito.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Baja temperatura para respuestas más determinísticas
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos timeout
      }
    );

    // Procesar respuesta de DeepSeek
    const aiResponse = response.data.choices[0]?.message?.content || '';
    const analysis = parseAIResponse(aiResponse);
    
    console.log(`✅ Validación de IA completada para reporte: ${report.id || 'unknown'}`);
    console.log(`   - Válido: ${analysis.isValid}`);
    console.log(`   - Confianza: ${analysis.confidence}`);
    console.log(`   - Tipo detectado: ${analysis.incidentType || 'N/A'}`);
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error en validación de IA:', error.message);
    
    // Si hay error, no fallar el proceso - retornar como válido por defecto
    return {
      isValid: true,
      confidence: 0.5,
      analysis: null,
      reason: `Error en validación de IA: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Construye el prompt para DeepSeek
 */
function buildValidationPrompt(report, userQuery) {
  const title = report.title || 'Sin título';
  const content = report.content || report.description || '';
  const location = report.location?.name || report.locations?.[0] || 'Ubicación no especificada';
  const source = report.source || 'Fuente desconocida';
  
  let prompt = `Eres un experto en análisis de reportes de movilidad urbana en Bogotá, Colombia. Tu tarea es analizar el siguiente reporte y determinar:

1. ¿Es un incidente REAL de movilidad que puede afectar el tránsito?
   - NO es un incidente si es: llamados a licitación, programas sociales, anuncios generales, información no relacionada con tránsito
   - SÍ es un incidente si: afecta vías, rutas, transporte público, tránsito vehicular o peatonal

2. ¿Qué tipo de incidente es?
   - "manifestación": protestas, marchas, bloqueos que afectan vías
   - "accidente": choques, colisiones, incidentes vehiculares
   - "obra": trabajos de construcción, mantenimiento de vías, obras públicas
   - "desvío": cierres temporales, desvíos de tránsito, vías cortadas
   - "otro": cualquier otro incidente que afecte la movilidad

3. ¿Qué puede afectar?
   - Lista específica: tránsito vehicular, rutas de TransMilenio, transporte público, vías específicas, etc.

4. ¿Está relacionado con la búsqueda del usuario? (si se proporciona)
   - Evalúa si el reporte menciona o está relacionado con la ubicación buscada por el usuario

REPORTE A ANALIZAR:
Título: ${title}
Contenido: ${content}
Ubicación mencionada: ${location}
Fuente: ${source}`;

  if (userQuery) {
    prompt += `\n\nBÚSQUEDA DEL USUARIO: "${userQuery}"`;
    prompt += `\n\n¿Este reporte está relacionado con "${userQuery}"? Considera variaciones del nombre:
- "autonorte" = "autopista norte" = "nqs"
- "el campín" = "campín" = "estadio el campín" = "estadio nemesio camacho el campín"
- "movistar arena" = "arena" (cerca de El Campín)
- Si el usuario busca "el campín" y el reporte menciona "Estadio Nemesio Camacho", "Movistar Arena", "Transversal 28", "Carrera 28", "Calle 57", "Calle 63", "Avenida NQS", o "Avenida Carrera 30", estas ubicaciones están CERCA de El Campín y son relevantes.`;
  }

  prompt += `\n\nIMPORTANTE: Responde SOLO en formato JSON válido con la siguiente estructura (sin texto adicional):
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "incidentType": "manifestación|accidente|obra|desvío|otro",
  "affects": ["tránsito", "rutas", "transporte público", etc.],
  "isRelevantToQuery": true/false,
  "reason": "Explicación breve del análisis (máximo 100 caracteres)",
  "extractedLocations": ["ubicación1", "ubicación2"],
  "severity": "baja|media|alta"
}`;

  return prompt;
}

/**
 * Parsea la respuesta de DeepSeek
 */
function parseAIResponse(aiResponse) {
  try {
    // Intentar extraer JSON de la respuesta
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isValid: parsed.isValid !== false, // Por defecto true si no se especifica
        confidence: parsed.confidence || 0.5,
        incidentType: parsed.incidentType || 'otro',
        affects: parsed.affects || [],
        isRelevantToQuery: parsed.isRelevantToQuery !== false,
        reason: parsed.reason || 'Análisis completado',
        extractedLocations: parsed.extractedLocations || [],
        severity: parsed.severity || 'media',
        rawResponse: aiResponse
      };
    }
    
    // Si no hay JSON, intentar inferir de la respuesta
    const lowerResponse = aiResponse.toLowerCase();
    const isValid = !lowerResponse.includes('no es válido') && 
                    !lowerResponse.includes('no es un incidente') &&
                    !lowerResponse.includes('no relevante');
    
    return {
      isValid,
      confidence: isValid ? 0.6 : 0.3,
      incidentType: inferIncidentType(lowerResponse),
      affects: [],
      isRelevantToQuery: true,
      reason: 'Análisis inferido de respuesta',
      extractedLocations: [],
      severity: 'media',
      rawResponse: aiResponse
    };
    
  } catch (error) {
    console.error('Error parseando respuesta de DeepSeek:', error);
    return {
      isValid: true, // Por defecto válido si hay error
      confidence: 0.5,
      incidentType: 'otro',
      affects: [],
      isRelevantToQuery: true,
      reason: 'Error parseando respuesta',
      extractedLocations: [],
      severity: 'media',
      rawResponse: aiResponse
    };
  }
}

/**
 * Infiere el tipo de incidente del texto
 */
function inferIncidentType(text) {
  if (text.includes('manifestación') || text.includes('protesta') || text.includes('marcha')) {
    return 'manifestación';
  }
  if (text.includes('accidente') || text.includes('choque') || text.includes('colisión')) {
    return 'accidente';
  }
  if (text.includes('obra') || text.includes('construcción') || text.includes('mantenimiento')) {
    return 'obra';
  }
  if (text.includes('desvío') || text.includes('cierre') || text.includes('cortado')) {
    return 'desvío';
  }
  return 'otro';
}

/**
 * Valida múltiples reportes en batch (con límite de rate)
 */
export async function validateMobilityReportsBatch(reports, userQuery = null, maxConcurrent = 3) {
  const results = [];
  
  // Procesar en lotes para evitar rate limiting
  for (let i = 0; i < reports.length; i += maxConcurrent) {
    const batch = reports.slice(i, i + maxConcurrent);
    const batchResults = await Promise.allSettled(
      batch.map(report => validateMobilityReport(report, userQuery))
    );
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push({
          report: batch[index],
          validation: result.value
        });
      } else {
        // Si falla, considerar válido por defecto
        results.push({
          report: batch[index],
          validation: {
            isValid: true,
            confidence: 0.5,
            analysis: null,
            reason: `Error: ${result.reason?.message || 'Unknown error'}`
          }
        });
      }
    });
    
    // Pequeño delay entre lotes para evitar rate limiting
    if (i + maxConcurrent < reports.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

