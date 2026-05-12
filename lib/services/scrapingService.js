import axios from 'axios';
import * as cheerio from 'cheerio';
import { getCachedScraping, saveCachedScraping } from '../db/incidents.js';
import { validateBlogpostTitle, validateMobilityReport, validateTemporalRelevance } from './aiValidationService.js';
import { getConfig } from './configService.js';

const BOGOTA_GOV_URL = 'https://bogota.gov.co/mi-ciudad/movilidad/en-vivo-movilidad-bogota-y-rutas-transmilenio';
const BOGOTA_GOV_NEWS_URL = 'https://bogota.gov.co/mi-ciudad/movilidad';
const CACHE_DURATION_MINUTES = 30;

/**
 * Obtiene actualizaciones en vivo de bogota.gov.co
 * @returns {Promise<Array>} Array de actualizaciones
 */
export async function getBogotaGovUpdates() {
  try {
    // Verificar cache primero
    const cached = await getCachedScraping();
    if (cached && isCacheValid(cached.timestamp)) {
      console.log('✅ Usando cache de bogota.gov.co');
      return cached.data;
    }

    console.log('🔍 Scrapeando bogota.gov.co...');
    
    const response = await axios.get(`${BOGOTA_GOV_URL}-${getCurrentDateString()}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const updates = [];

    // Buscar secciones de actualizaciones (estructura puede variar)
    // Buscar por formato "Corte HH:MM a/p. m."
    const contentText = $('main, article, .content').text();
    
    // Extraer actualizaciones por patrón de "Corte" seguido de hora
    const updatePattern = /Corte\s+(\d{1,2}:\d{2}\s+[ap]\.\s*m\.)[\s\S]*?(?=Corte|$)/gi;
    let match;
    let updateId = 1;

    while ((match = updatePattern.exec(contentText)) !== null && updateId <= 20) {
      const fullText = match[0];
      const timeMatch = match[1];
      
      // Extraer ubicaciones (líneas que empiezan con 📍)
      const locationMatches = fullText.match(/📍[^\n]+/g) || [];
      const locations = locationMatches.map(loc => loc.replace('📍', '').trim());

      // Extraer descripción principal
      const description = fullText.substring(0, 500).trim();

      if (description.length > 20) { // Solo agregar si tiene contenido suficiente
        updates.push({
          id: `bogota-${updateId++}`,
          timestamp: parseTimestamp(timeMatch),
          title: `Actualización ${timeMatch}`,
          content: description,
          locations: locations,
          url: `${BOGOTA_GOV_URL}-${getCurrentDateString()}`
        });
      }
    }

    // Si no se encontraron actualizaciones con el patrón, usar texto completo
    if (updates.length === 0 && contentText.length > 100) {
      updates.push({
        id: 'bogota-fallback',
        timestamp: new Date().toISOString(),
        title: 'Actualización de movilidad',
        content: contentText.substring(0, 2000),
        locations: [],
        url: `${BOGOTA_GOV_URL}-${getCurrentDateString()}`
      });
    }

    // Guardar en cache
    if (updates.length > 0) {
      await saveCachedScraping(updates);
    }

    console.log(`✅ Encontradas ${updates.length} actualizaciones de bogota.gov.co`);
    return updates;

  } catch (error) {
    console.error('Error scraping bogota.gov.co:', error.message);
    
    // Intentar usar cache aunque esté expirado
    const staleCache = await getCachedScraping();
    if (staleCache) {
      console.log('⚠️ Usando cache expirado debido a error');
      return staleCache.data;
    }
    
    return [];
  }
}

/**
 * Obtiene string de fecha actual para URL (formato: DD-de-mes-YYYY)
 */
function getCurrentDateString() {
  const now = new Date();
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  
  return `${day}-de-${month}-${year}`;
}

/**
 * Parsea timestamp de formato "HH:MM a/p. m." a ISO
 */
function parseTimestamp(timeStr) {
  const now = new Date();
  const [time, period] = timeStr.toLowerCase().replace(/\./g, '').split(/\s+/);
  const [hours, minutes] = time.split(':');
  
  let hour24 = parseInt(hours);
  if (period === 'pm' && hour24 !== 12) hour24 += 12;
  if (period === 'am' && hour24 === 12) hour24 = 0;
  
  const result = new Date(now);
  result.setHours(hour24, parseInt(minutes), 0, 0);
  
  // Si la hora es mayor a la actual, asumir que es de ayer
  if (result > now) {
    result.setDate(result.getDate() - 1);
  }
  
  return result.toISOString();
}

/**
 * Verifica si el cache es válido
 */
function isCacheValid(cacheTimestamp) {
  const cacheAge = (Date.now() - new Date(cacheTimestamp).getTime()) / 1000 / 60;
  return cacheAge < CACHE_DURATION_MINUTES;
}

/**
 * Obtiene blogposts de movilidad de bogota.gov.co
 * Scrapea la página principal de movilidad, encuentra blogposts del día actual,
 * valida títulos con IA, y itera sobre los relevantes para extraer reportes de movilidad
 * @param {string} userQuery - Búsqueda del usuario (sector/vía) para filtrar blogposts relevantes
 * @returns {Promise<Array>} Array de reportes de movilidad extraídos
 */
export async function getBogotaGovNews(userQuery = null) {
  // Inicializar debugInfo al inicio de la función (antes del try)
  const debugInfo = {
    userQuery: userQuery,
    blogpostsFound: 0,
    blogpostsValidated: 0,
    blogpostsAccepted: 0,
    validationDetails: []
  };
  
  try {
    console.log('🔍 Scrapeando blogposts de movilidad de bogota.gov.co...');
    if (userQuery) {
      console.log(`   Búsqueda del usuario: "${userQuery}"`);
    }
    const news = [];
    
    // Obtener fecha actual para filtrar
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 1. Scrapear página principal de movilidad: https://bogota.gov.co/mi-ciudad/movilidad
    // Esta página contiene los blogposts sobre movilidad
    // Si no hay blogposts publicados hoy, significa que no hay datos nuevos
    try {
      const response = await axios.get(BOGOTA_GOV_NEWS_URL, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });
      
      // Extraer blogposts de la página principal
      const blogposts = extractBlogpostsFromListing(response.data, BOGOTA_GOV_NEWS_URL, today);
      debugInfo.blogpostsFound = blogposts.length;
      console.log(`📰 Encontrados ${blogposts.length} blogposts del día actual en la página de movilidad`);
      
      // Log de títulos encontrados
      if (blogposts.length > 0) {
        console.log(`\n📋 TÍTULOS DE BLOGPOSTS ENCONTRADOS:`);
        blogposts.forEach((bp, index) => {
          console.log(`   ${index + 1}. "${bp.title}"`);
          console.log(`      - URL: ${bp.url}`);
          console.log(`      - Fecha: ${bp.date ? bp.date.toISOString() : 'N/A'}`);
          console.log(`      - Es del día: ${bp.isToday ? 'SÍ' : 'NO'}`);
        });
      }
      
      // 2. Validar títulos de blogposts con IA (si hay búsqueda del usuario)
      const validatedBlogposts = [];
      const validationResults = []; // Para debug
      
      // Palabras clave que indican eventos/celebraciones que pueden afectar movilidad
      // Incluye fechas especiales, días conmemorativos y eventos que suelen afectar la movilidad
      const eventKeywords = [
        // Eventos y celebraciones generales
        'evento', 'eventos', 'celebración', 'celebraciones', 'festival', 'festivales', 
        'concierto', 'conciertos', 'marcha', 'marchas', 'manifestación', 'manifestaciones',
        'cierre', 'cierres', 'desvío', 'desvíos', 'afecta', 'afectará', 'afectan',
        'jornada', 'jornadas', 'actividad', 'actividades',
        // Ciclovías (siempre afectan movilidad - cierran calles)
        'ciclovía', 'ciclovia', 'ciclovías', 'ciclovias', 'ciclovía de', 'ciclovia de',
        // Días especiales y conmemorativos (siempre revisar contenido)
        'día distrital', 'día del', 'día de', 'día internacional', 'día mundial',
        'día del peatón', 'día de la mujer', 'día de la tierra', 'día del medio ambiente',
        'día del ciclista', 'día sin carro', 'día sin moto', 'día de la bicicleta',
        'día del trabajador', 'día de la independencia', 'día de la raza',
        'día de los niños', 'día de la madre', 'día del padre',
        // Fechas especiales y temporadas
        'navidad', 'año nuevo', 'semana santa', 'puente', 'festivo', 'festivos',
        'vacaciones', 'temporada', 'feria', 'ferias', 'expo', 'exposición',
        // Eventos deportivos y culturales
        'maratón', 'maratones', 'carrera', 'carreras atléticas', 'ciclismo',
        'ciclomaratón', 'triatlón', 'caminata', 'caminatas', 'trote', 'trotas'
      ];
      
      if (userQuery && blogposts.length > 0) {
        console.log(`🤖 Validando títulos de blogposts con IA para búsqueda: "${userQuery}"`);
        console.log(`📋 Total de blogposts encontrados: ${blogposts.length}`);
        
        for (const blogpost of blogposts) {
          // Procesar si es del día actual O del día anterior con relevancia temporal
          if (blogpost.isToday || blogpost.isYesterday) {
            try {
              // Si es del día anterior, validar relevancia temporal con IA
              if (blogpost.isYesterday) {
                console.log(`📅 Validando relevancia temporal del blogpost del día anterior: "${blogpost.title}"`);
                const temporalValidation = await validateTemporalRelevance(blogpost.title, blogpost.date, today);
                
                if (!temporalValidation.isTemporallyRelevant) {
                  console.log(`   ⏭️ Blogpost del día anterior descartado (no es temporalmente relevante): "${blogpost.title}" - ${temporalValidation.reason}`);
                  continue;
                }
                
                console.log(`   ✅ Blogpost del día anterior es temporalmente relevante: "${blogpost.title}" - ${temporalValidation.reason}`);
              }
              
              const titleLower = blogpost.title.toLowerCase();
              
              // Buscar palabras clave de eventos (case-insensitive)
              const foundKeywords = eventKeywords.filter(keyword => titleLower.includes(keyword));
              const hasEventKeywords = foundKeywords.length > 0;
              
              // Debug: mostrar qué palabras clave se encontraron (SIEMPRE para los primeros 3 blogposts)
              if (hasEventKeywords) {
                console.log(`📅 Blogpost "${blogpost.title}": Contiene palabras clave de eventos (${foundKeywords.slice(0, 3).join(', ')}${foundKeywords.length > 3 ? '...' : ''}) - se revisará contenido completo`);
              }
              // No loggear debug detallado para reducir ruido - solo loggear si hay palabras clave encontradas
              
              const validation = await validateBlogpostTitle(blogpost.title, userQuery);
              
              // Guardar resultado para debug
              validationResults.push({
                title: blogpost.title,
                url: blogpost.url,
                score: validation.score,
                isRelevant: validation.isRelevant,
                reason: validation.reason,
                hasEventKeywords: hasEventKeywords
              });
              
              console.log(`📊 Blogpost "${blogpost.title}": Calificación ${validation.score}/10 (${validation.isRelevant ? 'RELEVANTE' : 'NO RELEVANTE'}) - ${validation.reason}${hasEventKeywords ? ' [Tiene palabras clave de eventos]' : ''}`);
              
              // Agregar si:
              // 1. Tiene calificación >= 7 (relevante por título), O
              // 2. Tiene palabras clave de eventos (se revisará contenido completo)
              if ((validation.isRelevant && validation.score >= 7) || hasEventKeywords) {
                validatedBlogposts.push({
                  ...blogpost,
                  validationScore: validation.score,
                  validationReason: validation.reason,
                  hasEventKeywords: hasEventKeywords,
                  needsContentReview: hasEventKeywords && (!validation.isRelevant || validation.score < 7)
                });
                if (hasEventKeywords && (!validation.isRelevant || validation.score < 7)) {
                  console.log(`✅ Blogpost aceptado para revisión de contenido: "${blogpost.title}" (tiene eventos/celebraciones)`);
                } else {
                  console.log(`✅ Blogpost aceptado: "${blogpost.title}" (${validation.score}/10)`);
                }
              } else {
                console.log(`⚠️ Blogpost descartado por baja calificación: "${blogpost.title}" (${validation.score}/10) - ${validation.reason}`);
              }
            } catch (error) {
              console.warn(`⚠️ Error validando título "${blogpost.title}":`, error.message);
              // Si hay error, incluir el blogpost por defecto
              validatedBlogposts.push(blogpost);
            }
          }
        }
        
        // Guardar información de debug
        debugInfo.blogpostsValidated = validationResults.length;
        debugInfo.blogpostsAccepted = validatedBlogposts.length;
        debugInfo.validationDetails = validationResults;
        
        // Log detallado de todos los resultados de validación
        console.log(`\n📋 RESUMEN DE VALIDACIÓN DE TÍTULOS:`);
        console.log(`   Búsqueda del usuario: "${userQuery}"`);
        console.log(`   Total de blogposts validados: ${validationResults.length}`);
        validationResults.forEach((result, index) => {
          console.log(`   ${index + 1}. "${result.title}"`);
          console.log(`      - Calificación: ${result.score}/10`);
          console.log(`      - Relevante: ${result.isRelevant ? 'SÍ' : 'NO'}`);
          console.log(`      - Razón: ${result.reason}`);
          console.log(`      - URL: ${result.url}`);
          if (result.hasEventKeywords) {
            console.log(`      📅 Tiene palabras clave de eventos/celebraciones`);
          }
          if (result.score < 7 && !result.hasEventKeywords) {
            console.log(`      ⚠️ DESCARTADO (calificación < 7 y sin eventos)`);
          } else if (result.score >= 7) {
            console.log(`      ✅ ACEPTADO (calificación >= 7)`);
          } else if (result.hasEventKeywords) {
            console.log(`      ✅ ACEPTADO PARA REVISIÓN (tiene eventos/celebraciones)`);
          }
        });
        const acceptedByScore = validatedBlogposts.filter(bp => bp.validationScore >= 7).length;
        const acceptedByEvents = validatedBlogposts.filter(bp => bp.needsContentReview).length;
        console.log(`\n✅ Blogposts aceptados por calificación (>= 7): ${acceptedByScore}`);
        console.log(`📅 Blogposts aceptados para revisión (eventos/celebraciones): ${acceptedByEvents}`);
        console.log(`✅ Total de blogposts aceptados: ${validatedBlogposts.length}`);
        console.log(`⚠️ Blogposts descartados: ${validationResults.length - validatedBlogposts.length}`);
      } else {
        // Si no hay búsqueda del usuario, usar todos los blogposts del día
        // También incluir blogposts del día anterior si tienen relevancia temporal
        const todayBlogposts = blogposts.filter(bp => bp.isToday);
        const yesterdayBlogposts = blogposts.filter(bp => bp.isYesterday);
        
        // Validar relevancia temporal de blogposts del día anterior
        const validatedYesterdayBlogposts = [];
        for (const blogpost of yesterdayBlogposts) {
          try {
            const temporalValidation = await validateTemporalRelevance(blogpost.title, blogpost.date, today);
            if (temporalValidation.isTemporallyRelevant) {
              validatedYesterdayBlogposts.push(blogpost);
              console.log(`   ✅ Blogpost del día anterior incluido: "${blogpost.title}" - ${temporalValidation.reason}`);
            } else {
              console.log(`   ⏭️ Blogpost del día anterior descartado: "${blogpost.title}" - ${temporalValidation.reason}`);
            }
          } catch (error) {
            console.warn(`   ⚠️ Error validando relevancia temporal de "${blogpost.title}":`, error.message);
            // Si hay error, incluir por defecto si tiene palabras clave temporales
            if (blogpost.hasTemporalKeywords) {
              validatedYesterdayBlogposts.push(blogpost);
            }
          }
        }
        
        validatedBlogposts.push(...todayBlogposts, ...validatedYesterdayBlogposts);
        console.log(`ℹ️ Sin búsqueda del usuario - usando todos los blogposts del día (${todayBlogposts.length}) y del día anterior temporalmente relevantes (${validatedYesterdayBlogposts.length})`);
      }
      
      console.log(`✅ ${validatedBlogposts.length} blogposts relevantes después de validación con IA`);
      
      // 3. Iterar sobre cada blogpost relevante y hacer scraping de su contenido completo
      for (const blogpost of validatedBlogposts) {
        const needsReview = blogpost.needsContentReview || false;
        console.log(`🔍 Scrapeando blogpost relevante: ${blogpost.title} (${blogpost.url})${blogpost.validationScore ? ` [Calificación: ${blogpost.validationScore}/10]` : ''}${needsReview ? ' [Revisión de contenido requerida]' : ''}`);
        
        try {
          // Hacer scraping del contenido completo del blogpost
          // Pasar needsContentReview para indicar que se debe revisar contenido aunque el título no sea relevante
          const blogpostNews = await scrapeBlogpostContent(blogpost.url, blogpost.title, userQuery, needsReview);
          news.push(...blogpostNews);
          console.log(`✅ Extraídos ${blogpostNews.length} reportes de movilidad del blogpost "${blogpost.title}"`);
        } catch (error) {
          console.error(`⚠️ Error scrapeando blogpost ${blogpost.url}:`, error.message);
        }
      }
      
      if (news.length > 0) {
        console.log(`📰 Total: ${news.length} reportes de movilidad extraídos de blogposts del día actual`);
      } else if (blogposts.length === 0) {
        console.log(`ℹ️ No hay blogposts publicados hoy en la página de movilidad (no hay datos nuevos)`);
      }
    } catch (error) {
      console.error('⚠️ Error scrapeando página de movilidad:', error.message);
      if (error.response && error.response.status === 404) {
        console.log(`ℹ️ La página de movilidad no está disponible (404)`);
      }
    }
    
    // 3. También intentar scrapear la página "en vivo" con fecha actual
    try {
      const liveUrl = `${BOGOTA_GOV_URL}-${getCurrentDateString()}`;
      console.log(`🔍 Scrapeando página en vivo: ${liveUrl}`);
      
      const liveResponse = await axios.get(liveUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });
      
      const newsFromLive = await extractNewsFromHTML(liveResponse.data, liveUrl);
      news.push(...newsFromLive);
      console.log(`📰 Encontrados ${newsFromLive.length} reportes de la página en vivo`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`ℹ️ La página en vivo no está disponible hoy (404) - esto es normal si no hay actualizaciones`);
      } else {
        console.error('⚠️ Error scrapeando página en vivo:', error.message);
      }
    }
    
    // Agregar información de debug a cada noticia (para debug en frontend)
    if (news.length > 0 && debugInfo && debugInfo.validationDetails && debugInfo.validationDetails.length > 0) {
      // Agregar metadata de debug a las noticias
      news.forEach(n => {
        n._debug = {
          userQuery: debugInfo.userQuery,
          blogpostsFound: debugInfo.blogpostsFound,
          blogpostsValidated: debugInfo.blogpostsValidated,
          blogpostsAccepted: debugInfo.blogpostsAccepted
        };
      });
    }
    
    // Retornar noticias con información de debug adjunta
    if (debugInfo) {
      news._debugInfo = debugInfo;
    }
    
    return news;
    
  } catch (error) {
    console.error('❌ Error scrapeando blogposts de bogota.gov.co:', error.message);
    console.error('   Stack:', error.stack);
    return [];
  }
}

/**
 * Extrae blogposts del listado de la página principal de movilidad
 * @param {string} html - HTML de la página principal
 * @param {string} baseUrl - URL base
 * @param {Date} today - Fecha de hoy (para filtrar)
 * @returns {Array} Array de blogposts del día actual
 */
function extractBlogpostsFromListing(html, baseUrl, today) {
  const $ = cheerio.load(html);
  const blogposts = [];
  
  console.log(`📄 Procesando listado de blogposts de movilidad...`);
  
  // Buscar enlaces a blogposts de movilidad
  const allLinks = $('a[href*="/movilidad/"]');
  console.log(`🔍 Encontrados ${allLinks.length} enlaces con "/movilidad/" en la página`);
  
  allLinks.each((i, el) => {
    if (blogposts.length >= 20) return false; // Limitar a 20 blogposts
    
    const $el = $(el);
    const href = $el.attr('href');
    const title = $el.text().trim() || $el.find('h2, h3, h4, .title').text().trim();
    
    if (!href || !title || title.length < 10) {
      if (i < 5) { // Log primeros 5 para debug
        console.log(`   ⚠️ Enlace ${i + 1} descartado: href="${href}", title="${title?.substring(0, 50)}"`);
      }
      return;
    }
    
    // Construir URL completa
    let fullUrl = href;
    if (!href.startsWith('http')) {
      fullUrl = href.startsWith('/') ? `https://bogota.gov.co${href}` : `${baseUrl}/${href}`;
    }
    
    // Buscar fecha de publicación - buscar en múltiples niveles del DOM
    // Buscar fecha en formato "PUBLICADO EL 07-NOV-2025", "07-NOV-2025", "08•Nov•2025", "Publicado el 08•Nov•2025"
    const datePatterns = [
      /PUBLICADO EL\s+(\d{1,2})[•\-]\s*(\w+)[•\-]\s*(\d{4})/i,
      /PUBLICADO\s+EL\s+(\d{1,2})[•\-]\s*(\w+)[•\-]\s*(\d{4})/i,
      /Publicado el\s+(\d{1,2})[•\-]\s*(\w+)[•\-]\s*(\d{4})/i,
      /Publicado\s+el\s+(\d{1,2})[•\-]\s*(\w+)[•\-]\s*(\d{4})/i,
      /(\d{1,2})[•\-]\s*(\w+)[•\-]\s*(\d{4})/i,
      /(\d{1,2})\s+(?:de\s+)?(\w+)\s+(?:de\s+)?(\d{4})/i
    ];
    
    let blogpostDate = null;
    let isToday = false;
    
    // Estrategia 1: Buscar en el elemento padre más cercano
    const $parent = $el.closest('article, .news-item, .article, .post, [class*="news"], [class*="article"], .card, [class*="card"], li, div');
    let searchText = $parent.text();
    
    for (const pattern of datePatterns) {
      const match = searchText.match(pattern);
      if (match) {
        blogpostDate = parseBlogpostDate(match);
        if (blogpostDate) {
          isToday = blogpostDate >= today;
          if (i < 5) {
            console.log(`   📅 Enlace ${i + 1} "${title.substring(0, 50)}": Fecha encontrada en padre: ${blogpostDate.toISOString()}, Es hoy: ${isToday}`);
          }
          break;
        }
      }
    }
    
    // Estrategia 2: Si no encontramos, buscar en el HTML del padre (para capturar texto oculto o con formato)
    if (!blogpostDate) {
      const parentHtml = $parent.html() || '';
      for (const pattern of datePatterns) {
        const match = parentHtml.match(pattern);
        if (match) {
          blogpostDate = parseBlogpostDate(match);
          if (blogpostDate) {
            isToday = blogpostDate >= today;
            if (i < 5) {
              console.log(`   📅 Enlace ${i + 1} "${title.substring(0, 50)}": Fecha encontrada en HTML del padre: ${blogpostDate.toISOString()}, Es hoy: ${isToday}`);
            }
            break;
          }
        }
      }
    }
    
    // Estrategia 3: Buscar en elementos hermanos (siblings)
    if (!blogpostDate) {
      const $siblings = $el.siblings();
      const siblingsText = $siblings.text();
      for (const pattern of datePatterns) {
        const match = siblingsText.match(pattern);
        if (match) {
          blogpostDate = parseBlogpostDate(match);
          if (blogpostDate) {
            isToday = blogpostDate >= today;
            if (i < 5) {
              console.log(`   📅 Enlace ${i + 1} "${title.substring(0, 50)}": Fecha encontrada en hermanos: ${blogpostDate.toISOString()}, Es hoy: ${isToday}`);
            }
            break;
          }
        }
      }
    }
    
    // Estrategia 4: Buscar en el contenedor padre del padre (abuelo)
    if (!blogpostDate) {
      const $grandparent = $el.parent().parent();
      const grandparentText = $grandparent.text();
      for (const pattern of datePatterns) {
        const match = grandparentText.match(pattern);
        if (match) {
          blogpostDate = parseBlogpostDate(match);
          if (blogpostDate) {
            isToday = blogpostDate >= today;
            if (i < 5) {
              console.log(`   📅 Enlace ${i + 1} "${title.substring(0, 50)}": Fecha encontrada en abuelo: ${blogpostDate.toISOString()}, Es hoy: ${isToday}`);
            }
            break;
          }
        }
      }
    }
    
    // Estrategia 5: Buscar en un radio más amplio (hasta 3 niveles arriba)
    if (!blogpostDate) {
      let $current = $el.parent();
      for (let level = 0; level < 3 && $current.length > 0; level++) {
        const levelText = $current.text();
        for (const pattern of datePatterns) {
          const match = levelText.match(pattern);
          if (match) {
            blogpostDate = parseBlogpostDate(match);
            if (blogpostDate) {
              isToday = blogpostDate >= today;
              if (i < 5) {
                console.log(`   📅 Enlace ${i + 1} "${title.substring(0, 50)}": Fecha encontrada en nivel ${level + 1}: ${blogpostDate.toISOString()}, Es hoy: ${isToday}`);
              }
              break;
            }
          }
        }
        if (blogpostDate) break;
        $current = $current.parent();
      }
    }
    
    // Estrategia 6: Buscar en el texto del enlace mismo
    if (!blogpostDate) {
      const linkText = $el.text();
      for (const pattern of datePatterns) {
        const match = linkText.match(pattern);
        if (match) {
          blogpostDate = parseBlogpostDate(match);
          if (blogpostDate) {
            isToday = blogpostDate >= today;
            if (i < 5) {
              console.log(`   📅 Enlace ${i + 1} "${title.substring(0, 50)}": Fecha encontrada en enlace: ${blogpostDate.toISOString()}, Es hoy: ${isToday}`);
            }
            break;
          }
        }
      }
    }
    
    // Si no encontramos fecha, log para debug
    if (!blogpostDate && i < 5) {
      console.log(`   ⚠️ Enlace ${i + 1} "${title.substring(0, 50)}": NO se encontró fecha`);
      console.log(`      Texto del padre (primeros 300 chars): ${searchText.substring(0, 300)}`);
      console.log(`      HTML del padre (primeros 300 chars): ${$parent.html()?.substring(0, 300) || 'N/A'}`);
    }
    
    // Verificar si es del día actual o del día anterior con palabras clave temporales
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isYesterday = blogpostDate && blogpostDate >= yesterday && blogpostDate < today;
    
    // Palabras clave temporales que indican eventos del fin de semana o días futuros
    const temporalKeywords = ['fin de semana', 'fin de semana', 'sábado', 'sabado', 'domingo', 
                              'sábado y domingo', 'sabado y domingo', 'este fin de semana', 
                              'próximo fin de semana', 'proximo fin de semana', 'hoy', 'mañana'];
    
    const titleLower = title.toLowerCase();
    const hasTemporalKeywords = temporalKeywords.some(keyword => titleLower.includes(keyword));
    
    // Agregar si:
    // 1. Es del día actual, O
    // 2. Es del día anterior Y tiene palabras clave temporales (se validará con IA después)
    if ((isToday || (isYesterday && hasTemporalKeywords)) && !blogposts.some(bp => bp.url === fullUrl)) {
      blogposts.push({
        title: title,
        url: fullUrl,
        date: blogpostDate,
        isToday: isToday,
        isYesterday: isYesterday && hasTemporalKeywords,
        hasTemporalKeywords: hasTemporalKeywords
      });
      if (isToday) {
        console.log(`   ✅ Blogpost agregado: "${title.substring(0, 50)}" (${blogpostDate ? blogpostDate.toISOString() : 'sin fecha'})`);
      } else if (isYesterday && hasTemporalKeywords) {
        console.log(`   📅 Blogpost del día anterior agregado (tiene palabras clave temporales): "${title.substring(0, 50)}" (${blogpostDate.toISOString()})`);
      }
    } else if (!isToday && !(isYesterday && hasTemporalKeywords) && blogpostDate && i < 5) {
      console.log(`   ⏭️ Blogpost descartado (no es de hoy ni tiene palabras clave temporales): "${title.substring(0, 50)}" (${blogpostDate.toISOString()})`);
    }
  });
  
  return blogposts;
}

/**
 * Parsea fecha de blogpost desde diferentes formatos
 * @param {Array} match - Resultado del regex match
 * @returns {Date|null} Fecha parseada o null
 */
function parseBlogpostDate(match) {
  try {
    const months = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
      'jan': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
    };
    
    let day, month, year;
    
    if (match.length === 4) {
      // Formato: "PUBLICADO EL 07-NOV-2025" o "07-NOV-2025"
      day = parseInt(match[1]);
      const monthStr = match[2].toLowerCase();
      year = parseInt(match[3]);
      
      // Buscar mes en el diccionario
      month = months[monthStr] !== undefined ? months[monthStr] : parseInt(monthStr) - 1;
    } else {
      // Formato: "07 de noviembre de 2025"
      day = parseInt(match[1]);
      const monthStr = match[2].toLowerCase();
      year = parseInt(match[3]);
      month = months[monthStr] !== undefined ? months[monthStr] : -1;
    }
    
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 2020) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      return date;
    }
  } catch (e) {
    console.warn(`⚠️ Error parseando fecha de blogpost: ${e.message}`);
  }
  
  return null;
}

/**
 * Hace scraping del contenido completo de un blogpost y extrae reportes de movilidad
 * Extrae cortes individuales (por hora) y valida cada uno con IA
 * @param {string} url - URL del blogpost
 * @param {string} title - Título del blogpost
 * @param {string} userQuery - Búsqueda del usuario (sector/vía) para validar cortes
 * @returns {Promise<Array>} Array de reportes de movilidad extraídos (uno por cada corte relevante)
 */
async function scrapeBlogpostContent(url, title, userQuery = null, needsContentReview = false) {
  try {
    console.log(`🔍 Scrapeando contenido completo del blogpost: "${title}"`);
    if (needsContentReview) {
      console.log(`   📅 Este blogpost requiere revisión de contenido (tiene eventos/celebraciones)`);
    }
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      }
    });
    
    // Usar la función existente extractNewsFromHTML para extraer reportes
    // Pasar userQuery para validar cada corte con IA
    // Pasar needsContentReview para indicar que se debe revisar contenido aunque el título no sea relevante
    const news = await extractNewsFromHTML(response.data, url, userQuery, needsContentReview);
    
    if (needsContentReview && news.length === 0) {
      console.log(`   ⚠️ Blogpost con eventos/celebraciones no generó reportes - puede que no mencione ubicaciones relevantes`);
    }
    
    return news;
  } catch (error) {
    console.error(`⚠️ Error scrapeando blogpost ${url}:`, error.message);
    return [];
  }
}

/**
 * Extrae noticias/reportes de movilidad de HTML de bogota.gov.co
 * Extrae cortes individuales (por hora) y valida cada uno con IA si hay userQuery
 * @param {string} html - HTML a procesar
 * @param {string} baseUrl - URL base para construir URLs completas (link de la fuente)
 * @param {string} userQuery - Búsqueda del usuario (sector/vía) para validar cortes
 * @param {boolean} needsContentReview - Si es true, revisa el contenido completo para eventos/celebraciones
 * @returns {Promise<Array>} Array de reportes extraídos (uno por cada corte relevante)
 */
export async function extractNewsFromHTML(html, baseUrl, userQuery = null, needsContentReview = false) {
  const $ = cheerio.load(html);
  const news = [];
  
  // Obtener fecha actual para filtrar
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Buscar en el HTML estructurado - múltiples estrategias para encontrar el contenido real
  let bodyText = '';
  
  // Estrategia 1: Buscar en elementos específicos de contenido de artículos
  const articleContent = $('article, [role="article"], .article-content, .post-content, .entry-content, [class*="article"], [class*="post"]').first();
  if (articleContent.length > 0) {
    bodyText = articleContent.text();
  }
  
  // Estrategia 2: Si no hay suficiente texto, buscar en main o content
  if (bodyText.length < 500) {
    const mainContent = $('main, .content, [class*="content"]').first();
    if (mainContent.length > 0) {
      // Excluir navegación y menús
      mainContent.find('nav, header, footer, .menu, .navigation, [class*="menu"], [class*="nav"]').remove();
      bodyText = mainContent.text();
    }
  }
  
  // Estrategia 3: Si aún no hay suficiente texto, extraer de párrafos y divs principales
  if (bodyText.length < 500) {
    // Buscar párrafos que contengan texto sustancial (más de 50 caracteres)
    const paragraphs = $('p, div[class*="text"], div[class*="content"], div[class*="body"]')
      .filter((i, el) => $(el).text().trim().length > 50)
      .map((i, el) => $(el).text().trim())
      .get();
    bodyText = paragraphs.join(' ').trim() || bodyText;
  }
  
  // Estrategia 4: Si aún no hay suficiente texto, usar body completo pero excluir navegación
  if (bodyText.length < 500) {
    const body = $('body');
    body.find('nav, header, footer, .menu, .navigation, [class*="menu"], [class*="nav"], script, style').remove();
    bodyText = body.text();
  }
  
  // Limpiar el texto: eliminar espacios múltiples y saltos de línea excesivos
  bodyText = bodyText.replace(/\s+/g, ' ').trim();
  
  // Log para debug: mostrar longitud del texto extraído y preview
  if (needsContentReview && userQuery) {
    console.log(`   📄 Texto extraído del artículo: ${bodyText.length} caracteres`);
    if (bodyText.length < 500) {
      console.log(`   ⚠️ ADVERTENCIA: Texto extraído muy corto (${bodyText.length} caracteres). Preview: "${bodyText.substring(0, 200)}..."`);
    } else {
      // Mostrar preview del texto para verificar que contiene ubicaciones
      const preview = bodyText.substring(0, 500);
      console.log(`   📄 Preview del texto: "${preview}..."`);
    }
  }
  
  // Si necesita revisión de contenido (eventos/celebraciones), buscar ubicaciones relevantes en todo el contenido
  if (needsContentReview && userQuery) {
    console.log(`   🔍 Revisando contenido completo del artículo para ubicaciones relevantes a "${userQuery}"`);
    
    // Normalizar la búsqueda del usuario para comparación
    const userQueryLower = userQuery.toLowerCase();
    const userQueryNormalized = userQueryLower
      .replace(/autonorte/gi, 'autopista norte')
      .replace(/nqs/gi, 'autopista norte')
      .replace(/el campín/gi, 'campín')
      .replace(/estadio nemesio camacho/gi, 'campín');
    
    // Buscar ubicaciones mencionadas en el contenido completo
    // Patrón mejorado para capturar más variaciones de ubicaciones
    const locationPattern = /(?:av\.|avenida|calle|carrera|cra\.|cra|transversal|autopista|localidad|sector|zona|vía|universidad|portal|aeropuerto|autonorte|nqs|parque|estadio|plaza|centro)\s+[^\n\.\,\;]+(?:\s+(?:y|con|en|entre|hasta|desde)\s+(?:av\.|avenida|calle|carrera|cra\.|cra|transversal|autopista|localidad|sector|zona|vía|universidad|portal|aeropuerto|autonorte|nqs|parque|estadio|plaza|centro)\s+[^\n\.\,\;]+)*/gi;
    const allLocationMatches = bodyText.match(locationPattern) || [];
    
    // Solo loggear si hay ubicaciones encontradas o si es necesario para debug
    if (allLocationMatches.length > 0) {
      console.log(`   🔍 Encontradas ${allLocationMatches.length} menciones de ubicaciones en el contenido`);
      if (allLocationMatches.length <= 20) {
        console.log(`   📍 Ubicaciones encontradas: ${allLocationMatches.slice(0, 10).map(loc => `"${loc.trim().substring(0, 50)}"`).join(', ')}`);
      }
    }
    
    // Buscar menciones específicas de la búsqueda del usuario
    const userQueryPatterns = [
      new RegExp(userQueryNormalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      new RegExp(userQueryNormalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'gi')
    ];
    
    let foundRelevantLocation = false;
    let relevantLocationText = '';
    
    // Mapeo de ubicaciones cercanas conocidas (para reconocer ubicaciones relacionadas)
    const nearbyLocationsMap = {
      'parque nacional': ['carrera séptima', 'carrera 7', 'cra 7', 'cra séptima', 'carrera séptima entre', 'carrera 7 entre', 'carrera séptima entre calles', 'carrera 7 entre calles', 'carrera 57', 'carrera 59', 'carrera 60', 'calle 36', 'calle 39', 'calle 44', 'calle 53', 'avenida calle 26', 'entre calles 36 y 39', 'calles 36 y 39'],
      'carrera séptima': ['parque nacional', 'parque', 'calle 36', 'calle 39', 'entre calles 36 y 39', 'calles 36 y 39'],
      'carrera 7': ['parque nacional', 'parque', 'calle 36', 'calle 39', 'entre calles 36 y 39', 'calles 36 y 39'],
      'el campín': ['movistar arena', 'arena', 'estadio', 'estadio nemesio camacho', 'estadio el campín', 'calle 57', 'calle 63', 'transversal 28', 'carrera 28', 'avenida nqs', 'avenida carrera 30'],
      'campín': ['movistar arena', 'arena', 'estadio', 'estadio nemesio camacho', 'estadio el campín', 'calle 57', 'calle 63', 'transversal 28', 'carrera 28', 'avenida nqs', 'avenida carrera 30'],
      'autopista norte': ['autonorte', 'nqs', 'avenida caracas', 'calle 80']
    };
    
    // Obtener ubicaciones cercanas conocidas para la búsqueda del usuario
    // Intentar con la versión normalizada primero, luego con la original
    const nearbyLocations = nearbyLocationsMap[userQueryNormalized] || nearbyLocationsMap[userQueryLower] || [];
    const allRelevantTerms = [userQueryNormalized, ...nearbyLocations];
    
    console.log(`   🔍 Buscando ubicaciones relevantes para "${userQueryNormalized}"`);
    console.log(`   📍 Términos relevantes a buscar: ${allRelevantTerms.join(', ')}`);
    
    // Verificar si alguna ubicación mencionada es relevante para la búsqueda del usuario
    for (const locMatch of allLocationMatches) {
      const locLower = locMatch.toLowerCase()
        .replace(/autonorte/gi, 'autopista norte')
        .replace(/nqs/gi, 'autopista norte')
        .replace(/el campín/gi, 'campín')
        .replace(/estadio nemesio camacho/gi, 'campín')
        .replace(/parque nacional/gi, 'parque nacional')
        .replace(/cra\./gi, 'carrera')
        .replace(/cra /gi, 'carrera ')
        .replace(/cra\s/gi, 'carrera ');
      
      // Verificar si la ubicación mencionada es relevante para la búsqueda del usuario
      // Incluir verificación de ubicaciones cercanas conocidas
      const isRelevant = locLower.includes(userQueryNormalized) || 
          userQueryPatterns.some(pattern => pattern.test(locLower)) ||
          allRelevantTerms.some(term => locLower.includes(term)) ||
          (userQueryNormalized.includes('carrera') && locLower.includes('carrera')) ||
          (userQueryNormalized.includes('séptima') && locLower.includes('séptima')) ||
          (userQueryNormalized.includes('septima') && locLower.includes('septima')) ||
          (userQueryNormalized.includes('parque') && locLower.includes('parque')) ||
          (userQueryNormalized.includes('parque nacional') && (locLower.includes('carrera séptima') || locLower.includes('carrera 7') || locLower.includes('cra 7') || locLower.includes('carrera 57') || locLower.includes('carrera 59') || locLower.includes('carrera 60') || locLower.includes('entre calles 36') || locLower.includes('calles 36 y 39'))) ||
          (userQueryNormalized.includes('parque nacional') && locLower.includes('calle 36') && locLower.includes('calle 39')) ||
          (userQueryNormalized.includes('campín') && (locLower.includes('estadio') || locLower.includes('campín') || locLower.includes('movistar arena') || locLower.includes('arena') || locLower.includes('calle 57') || locLower.includes('calle 63') || locLower.includes('transversal 28') || locLower.includes('carrera 28') || locLower.includes('avenida nqs') || locLower.includes('avenida carrera 30'))) ||
          (userQueryNormalized.includes('el campín') && (locLower.includes('estadio') || locLower.includes('campín') || locLower.includes('movistar arena') || locLower.includes('arena') || locLower.includes('calle 57') || locLower.includes('calle 63') || locLower.includes('transversal 28') || locLower.includes('carrera 28') || locLower.includes('avenida nqs') || locLower.includes('avenida carrera 30')));
      
      if (isRelevant) {
        foundRelevantLocation = true;
        relevantLocationText = locMatch.trim();
        console.log(`   ✅ Ubicación relevante encontrada en el contenido: "${relevantLocationText}"`);
        break;
      }
      // No loggear ubicaciones no relevantes para reducir ruido
    }
    
    // Si no se encontró ubicación relevante con el patrón regex, buscar directamente en el texto
    if (!foundRelevantLocation) {
      console.log(`   🔍 No se encontró ubicación relevante con patrón regex, buscando directamente en el texto...`);
      
      // Buscar directamente menciones de ubicaciones cercanas en el texto
      for (const term of allRelevantTerms) {
        const termPattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (termPattern.test(bodyText)) {
          // Buscar el contexto alrededor de la mención
          const matches = [...bodyText.matchAll(termPattern)];
          if (matches.length > 0) {
            const match = matches[0];
            const startIndex = Math.max(0, match.index - 50);
            const endIndex = Math.min(bodyText.length, match.index + match[0].length + 50);
            const context = bodyText.substring(startIndex, endIndex);
            
            // Intentar extraer la ubicación completa del contexto
            const contextLocationPattern = /(?:av\.|avenida|calle|carrera|cra\.|cra|transversal|autopista|localidad|sector|zona|vía|universidad|portal|aeropuerto|autonorte|nqs|parque|estadio|plaza|centro)\s+[^\n\.\,\;]+/gi;
            const contextMatches = context.match(contextLocationPattern);
            if (contextMatches && contextMatches.length > 0) {
              foundRelevantLocation = true;
              relevantLocationText = contextMatches[0].trim();
              console.log(`   ✅ Ubicación relevante encontrada en contexto: "${relevantLocationText}"`);
              break;
            }
          }
        }
      }
    }
    
    // Si se encontró una ubicación relevante, crear incidentes de tipo "evento" o "recomendación"
    if (foundRelevantLocation) {
      // Extraer todas las ubicaciones mencionadas en el contenido, pero filtrar las irrelevantes
      const allLocationMatches = bodyText.match(locationPattern) || [];
      
      // Filtrar ubicaciones irrelevantes (menús, navegación, direcciones de contacto, etc.)
      // Solo incluir ubicaciones que estén en contexto de cierres, eventos o movilidad
      const filteredLocations = allLocationMatches
        .map(loc => loc.trim())
        .filter(loc => {
          // Filtrar ubicaciones muy cortas o muy largas
          if (loc.length < 5 || loc.length > 150) return false;
          
          // Filtrar direcciones de contacto (teléfonos, horarios, etc.)
          if (loc.match(/(?:tel|teléfono|phone|horario|atención|lunes|viernes|7:00|8:00|9:00)/i)) return false;
          
          // Filtrar enlaces y navegación
          if (loc.match(/(?:portal|web|alcaldía|mayor|bogotá|consulta|más|ir al|especial|contenidos|relacionados)/i)) return false;
          
          // Filtrar ubicaciones que son solo números o códigos
          if (loc.match(/^(?:cra|carrera|calle|avenida|av)\s*(?:8|10|12|65|N°|#)/i)) return false;
          
          // Filtrar ubicaciones que contienen HTML tags o caracteres especiales
          if (loc.match(/<[^>]+>|<\/|\\u|\\n|\\r/)) return false;
          
          // Filtrar ubicaciones que son parte de títulos de artículos o secciones
          if (loc.match(/(?:finalistas|concurso|internacional|violín|ciudad|bogotá|2025|noche|final|noviembre|gana|premio|earthshot|consolida|referente|global|sostenibilidad|urbana|transparencia|participación|fortalece|estrategia|datos|abiertos|plataforma|promover|elecciones|consejos|vendedores|informales|locales|garantizar|representación|gremio|decisiones|distrito)/i)) return false;
          
          // IMPORTANTE: Solo incluir ubicaciones que estén en contexto de cierres, eventos o movilidad
          // Buscar el contexto alrededor de la ubicación en el texto
          const locIndex = bodyText.toLowerCase().indexOf(loc.toLowerCase());
          if (locIndex === -1) return false;
          
          // Extraer contexto (200 caracteres antes y después)
          const contextStart = Math.max(0, locIndex - 200);
          const contextEnd = Math.min(bodyText.length, locIndex + loc.length + 200);
          const context = bodyText.substring(contextStart, contextEnd).toLowerCase();
          
          // Verificar que el contexto contenga palabras relacionadas con movilidad, cierres o eventos
          const mobilityKeywords = /(?:cierre|desvío|afecta|cerrado|bloqueado|evento|celebración|festival|concierto|marcha|manifestación|actividad|jornada|movilidad|tráfico|transmilenio|vía|calzada|ambas|entre|desde|hasta|sector|zona)/i;
          if (!mobilityKeywords.test(context)) return false;
          
          return true;
        });
      
      // Obtener ubicaciones únicas y limitar a máximo 5 ubicaciones relevantes (reducido de 10)
      const uniqueLocations = [...new Set(filteredLocations)].slice(0, 5);
      
      // Si no hay ubicaciones únicas filtradas, usar la ubicación relevante encontrada
      const locationsToProcess = uniqueLocations.length > 0 ? uniqueLocations : [relevantLocationText];
      
      // Crear un incidente por cada ubicación única con contenido específico
      for (const locationName of locationsToProcess) {
        // Extraer el contexto específico alrededor de esta ubicación (100 caracteres antes y después)
        const locationIndex = bodyText.toLowerCase().indexOf(locationName.toLowerCase());
        let locationContext = '';
        
        if (locationIndex !== -1) {
          const startIndex = Math.max(0, locationIndex - 100);
          const endIndex = Math.min(bodyText.length, locationIndex + locationName.length + 100);
          locationContext = bodyText.substring(startIndex, endIndex).trim();
        } else {
          // Si no se encuentra la ubicación exacta, buscar cierres o eventos relacionados
          const closurePattern = new RegExp(`(?:cierre|desvío|afecta|cerrado|bloqueado|evento|celebración).*?${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?(?:\\.|\\n|$)`, 'gi');
          const closureMatch = bodyText.match(closurePattern);
          if (closureMatch && closureMatch.length > 0) {
            locationContext = closureMatch[0].trim();
          } else {
            // Si no hay contexto específico, usar información general del evento
            locationContext = bodyText.substring(0, 200).trim();
          }
        }
        
        // Extraer información específica del evento para esta ubicación (incluir ciclovía)
        const eventInfoPattern = /(?:evento|celebración|festival|concierto|marcha|manifestación|actividad|jornada|ciclovía|ciclovia)[^\n\.]{0,200}/gi;
        const eventInfoMatches = locationContext.match(eventInfoPattern) || [];
        const eventInfo = eventInfoMatches.length > 0 ? eventInfoMatches[0].substring(0, 200).trim() : '';
        
        // Extraer información específica de ciclovía
        const cicloviaPattern = new RegExp(`ciclovía.*?${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?(?:\\.|\\n|$)`, 'gi');
        const cicloviaMatches = bodyText.match(cicloviaPattern) || [];
        const cicloviaInfo = cicloviaMatches.length > 0 
          ? cicloviaMatches[0].substring(0, 200).trim()
          : '';
        
        // Extraer cierres específicos para esta ubicación
        const closuresPattern = new RegExp(`(?:cierre|desvío|afecta|cerrado|bloqueado).*?${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?(?:\\.|\\n|$)`, 'gi');
        const closuresMatches = bodyText.match(closuresPattern) || [];
        const closuresInfo = closuresMatches.length > 0 
          ? closuresMatches[0].substring(0, 150).trim()
          : '';
        
        // Extraer fecha/hora del evento si está mencionada en el contexto
        const dateTimePattern = /(?:el|este|el próximo|el día)\s+(\d{1,2})\s+(?:de\s+)?(\w+)(?:\s+de\s+(\d{4}))?(?:\s+de\s+(\d{1,2}:\d{2}))?/gi;
        const dateTimeMatch = locationContext.match(dateTimePattern);
        const eventDateTime = dateTimeMatch ? dateTimeMatch[0] : '';
        
        // Construir contenido específico para esta ubicación
        let specificContent = '';
        if (cicloviaInfo) {
          // Si hay información de ciclovía, usarla (las ciclovías siempre afectan movilidad)
          specificContent = `Ciclovía en ${locationName}. ${cicloviaInfo}`;
        } else if (closuresInfo) {
          specificContent = closuresInfo;
        } else if (eventInfo) {
          specificContent = eventInfo;
        } else if (locationContext.length > 50) {
          specificContent = locationContext.substring(0, 200).trim();
        } else {
          specificContent = `Evento o celebración que puede afectar la movilidad en ${locationName}`;
        }
        
        // Agregar fecha si está disponible
        if (eventDateTime) {
          specificContent += `. Fecha: ${eventDateTime}`;
        }
        
        // Si la ubicación menciona "ciclovía", agregar nota específica
        if (locationName.toLowerCase().includes('ciclovía') || locationName.toLowerCase().includes('ciclovia')) {
          specificContent += `. IMPORTANTE: Las ciclovías implican cierres de vías para permitir el paso de ciclistas y peatones, lo que afecta significativamente el tránsito vehicular.`;
        } else {
          specificContent += `. Se recomienda estar alerta en este sector ya que los eventos pueden generar cierres de vías o afectar el tránsito.`;
        }
        
        // Limpiar HTML del nombre de la ubicación
        const cleanLocationName = locationName.replace(/<[^>]*>/g, '').trim();
        
        news.push({
          id: `bogota-news-event-${Date.now()}-${news.length}-${cleanLocationName.replace(/\s+/g, '-')}`,
          timestamp: new Date().toISOString(),
          title: `Evento en ${cleanLocationName} - Recomendación de movilidad`,
          content: specificContent,
          locations: [cleanLocationName],
          url: baseUrl,
          source: 'bogota.gov.co-news',
          type: 'evento' // Tipo especial para eventos
        });
        
        console.log(`   ✅ Incidente de evento creado para "${locationName}" con contenido específico`);
      }
      
      console.log(`   ✅ Creados ${locationsToProcess.length} incidentes de evento para ubicaciones únicas`);
    } else {
      console.log(`   ⚠️ No se encontraron ubicaciones relevantes en el contenido del artículo`);
      
      // Si hay ciclovía en el contenido, intentar extraer la ubicación de la ciclovía
      const hasCiclovia = bodyText.toLowerCase().includes('ciclovía') || bodyText.toLowerCase().includes('ciclovia');
      if (hasCiclovia) {
        console.log(`   🚴 Detectada mención de ciclovía en el contenido, intentando extraer ubicación...`);
        
        // Buscar patrones como "ciclovía de la carrera séptima", "ciclovía carrera séptima", etc.
        // Patrón mejorado para capturar mejor "carrera séptima", "carrera 7", etc.
        const cicloviaLocationPattern = /ciclovía\s+(?:de\s+)?(?:la\s+)?(carrera|calle|avenida|av\.|transversal|autopista)\s+([^\n\.\,\;]+?)(?:\s|\.|,|;|$)/gi;
        const cicloviaLocationMatches = [...bodyText.matchAll(cicloviaLocationPattern)];
        
        if (cicloviaLocationMatches.length > 0) {
          for (const match of cicloviaLocationMatches.slice(0, 3)) {
            const locationType = match[1];
            let locationName = match[2].trim();
            
            // Limpiar el nombre de la ubicación (remover palabras comunes al final)
            locationName = locationName.replace(/\s+(?:y|con|en|entre|hasta|desde|del|de la|de|la|el|los|las)\s*$/i, '').trim();
            
            const fullLocation = `${locationType} ${locationName}`;
            
            // Verificar si es relevante para la búsqueda del usuario
            const locationLower = fullLocation.toLowerCase();
            // Si hay búsqueda del usuario, verificar relevancia; si no hay búsqueda, todas las ciclovías son relevantes
            const isRelevant = !userQuery || (allRelevantTerms && allRelevantTerms.length > 0 && allRelevantTerms.some(term => locationLower.includes(term.toLowerCase())));
            
            if (isRelevant) {
              console.log(`   ✅ Ubicación de ciclovía encontrada: "${fullLocation}"`);
              
              // Extraer contexto de la ciclovía (buscar en un rango más amplio)
              const cicloviaIndex = bodyText.toLowerCase().indexOf(`ciclovía`);
              let cicloviaContext = '';
              
              if (cicloviaIndex !== -1) {
                const startIndex = Math.max(0, cicloviaIndex - 100);
                const endIndex = Math.min(bodyText.length, cicloviaIndex + 400);
                cicloviaContext = bodyText.substring(startIndex, endIndex).trim();
              } else {
                cicloviaContext = `Ciclovía en ${fullLocation}`;
              }
              
              // Limpiar HTML del nombre de la ubicación
              const cleanFullLocation = fullLocation.replace(/<[^>]*>/g, '').trim();
              
              news.push({
                id: `bogota-news-ciclovia-${Date.now()}-${news.length}-${cleanFullLocation.replace(/\s+/g, '-')}`,
                timestamp: new Date().toISOString(),
                title: `Ciclovía en ${cleanFullLocation} - Afecta movilidad`,
                content: `${cicloviaContext.substring(0, 300)}. IMPORTANTE: Las ciclovías implican cierres de vías para permitir el paso de ciclistas y peatones, lo que afecta significativamente el tránsito vehicular.`,
                locations: [cleanFullLocation],
                url: baseUrl,
                source: 'bogota.gov.co-news',
                type: 'evento'
              });
              
              console.log(`   ✅ Incidente de ciclovía creado para "${cleanFullLocation}"`);
            }
          }
        }
      }
      
      console.log(`   💡 Intentando usar DeepSeek para extraer ubicaciones del contenido...`);
      
      // Si no se encontró ubicación relevante, usar DeepSeek para analizar el contenido completo
      try {
        const apiKey = await getConfig('deepseek_api_key', null);
        if (apiKey) {
          // Extraer un resumen del contenido (primeros 2000 caracteres)
          const contentSummary = bodyText.substring(0, 2000).trim();
          
          const prompt = `Eres un experto en análisis de artículos de movilidad urbana en Bogotá, Colombia.

CONTENIDO DEL ARTÍCULO (resumen):
${contentSummary}

BÚSQUEDA DEL USUARIO: "${userQuery}"

Tu tarea es determinar si el artículo menciona ubicaciones relevantes para la búsqueda del usuario "${userQuery}".

IMPORTANTE: 
- Si el usuario busca "parque nacional" y el artículo menciona "Carrera Séptima", "Carrera 7", "Carrera 57", "Carrera 59", "Carrera 60", "Calle 36", "Calle 39", "Calle 44", "Calle 53", "entre calles 36 y 39", "calles 36 y 39", o "Avenida Calle 26", estas ubicaciones están CERCA del Parque Nacional y son relevantes.
- Si el artículo menciona "Carrera Séptima, entre calles 36 y 39, frente al Parque Nacional", esto es MUY relevante para la búsqueda "parque nacional".
- Si el usuario busca "carrera séptima" y el artículo menciona "Parque Nacional", "Calle 36", "Calle 39", "entre calles 36 y 39", estas ubicaciones están CERCA de la Carrera Séptima y son relevantes.

Responde SOLO en formato JSON válido (sin texto adicional):
{
  "hasRelevantLocation": true/false,
  "relevantLocation": "ubicación encontrada o vacío",
  "reason": "Explicación breve (máximo 100 caracteres)"
}`;

          const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'system',
                  content: 'Eres un experto en análisis de artículos de movilidad urbana en Bogotá, Colombia. Responde siempre en formato JSON válido.'
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
            if (parsed.hasRelevantLocation && parsed.relevantLocation) {
              foundRelevantLocation = true;
              relevantLocationText = parsed.relevantLocation;
              console.log(`   ✅ DeepSeek encontró ubicación relevante: "${relevantLocationText}" - ${parsed.reason}`);
              
              // Crear el incidente de evento
              const eventInfoPattern = /(?:evento|celebración|festival|concierto|marcha|manifestación|actividad|jornada)[^\n\.]{0,200}/gi;
              const eventInfoMatches = bodyText.match(eventInfoPattern) || [];
              const eventInfo = eventInfoMatches.length > 0 ? eventInfoMatches[0].substring(0, 300).trim() : '';
              
              news.push({
                id: `bogota-news-event-${Date.now()}-${news.length}`,
                timestamp: new Date().toISOString(),
                title: `Evento en ${relevantLocationText} - Recomendación de movilidad`,
                content: `${eventInfo || `Evento o celebración que puede afectar la movilidad en ${relevantLocationText}`}. Se recomienda estar alerta en este sector ya que los eventos pueden generar cierres de vías o afectar el tránsito.`,
                locations: [relevantLocationText],
                url: baseUrl,
                source: 'bogota.gov.co-news',
                type: 'evento'
              });
              
              console.log(`   ✅ Incidente de evento creado usando DeepSeek para "${relevantLocationText}"`);
            } else {
              console.log(`   ⚠️ DeepSeek no encontró ubicaciones relevantes: ${parsed.reason || 'No relevante'}`);
            }
          }
        }
      } catch (error) {
        console.error(`   ❌ Error usando DeepSeek para extraer ubicaciones:`, error.message);
      }
    }
  }
  
  // Buscar el título principal "Así están las vías en Bogotá y las rutas de TransMilenio..."
  const mainTitlePattern = /Así están las vías en Bogotá y las rutas de TransMilenio[^\n]*/i;
  const mainTitleMatch = bodyText.match(mainTitlePattern);
  
  // Si no se encontró el título principal pero se necesita revisión de contenido (eventos/celebraciones),
  // buscar ubicaciones relevantes en todo el contenido del artículo
  // También buscar si hay menciones de "ciclovía" (siempre afecta movilidad)
  const hasCicloviaInContent = bodyText.toLowerCase().includes('ciclovía') || bodyText.toLowerCase().includes('ciclovia');
  
  // Si hay ciclovía en el contenido, siempre procesar (las ciclovías siempre afectan movilidad)
  // También procesar si se necesita revisión de contenido y hay búsqueda del usuario
  if (!mainTitleMatch && ((needsContentReview && userQuery) || hasCicloviaInContent)) {
    console.log(`   🔍 No se encontró título principal "Así están las vías...", pero se requiere revisión de contenido para eventos/celebraciones${hasCicloviaInContent ? ' o se detectó ciclovía' : ''}`);
    
    // Normalizar la búsqueda del usuario (si existe)
    let userQueryLower = '';
    let userQueryNormalized = '';
    if (userQuery) {
      console.log(`   🔍 Buscando ubicaciones relevantes para "${userQuery}" en todo el contenido del artículo...`);
      userQueryLower = userQuery.toLowerCase();
      userQueryNormalized = userQueryLower
        .replace(/autonorte/gi, 'autopista norte')
        .replace(/nqs/gi, 'autopista norte')
        .replace(/el campín/gi, 'campín')
        .replace(/estadio nemesio camacho/gi, 'campín');
    } else if (hasCicloviaInContent) {
      console.log(`   🚴 Detectada mención de ciclovía en el contenido - las ciclovías siempre afectan movilidad`);
    }
    
    // Buscar ubicaciones mencionadas en el contenido completo
    // Incluir "ciclovía" como parte del patrón de ubicación
    const locationPattern = /(?:av\.|avenida|calle|carrera|cra\.|cra|transversal|autopista|localidad|sector|zona|vía|universidad|portal|aeropuerto|autonorte|nqs|parque|estadio|plaza|centro|movistar arena|arena|ciclovía|ciclovia)\s+[^\n\.\,\;]+(?:\s+(?:y|con|en|entre|hasta|desde|de la|del)\s+(?:av\.|avenida|calle|carrera|cra\.|cra|transversal|autopista|localidad|sector|zona|vía|universidad|portal|aeropuerto|autonorte|nqs|parque|estadio|plaza|centro|movistar arena|arena|ciclovía|ciclovia)\s+[^\n\.\,\;]+)*/gi;
    const allLocationMatches = bodyText.match(locationPattern) || [];
    
    // Buscar específicamente menciones de "ciclovía de [ubicación]" o "ciclovía [ubicación]"
    const cicloviaPattern = /ciclovía\s+(?:de\s+)?(?:la\s+)?(?:carrera|calle|avenida|av\.|avenida|transversal|autopista)\s+[^\n\.\,\;]+/gi;
    const cicloviaMatches = bodyText.match(cicloviaPattern) || [];
    
    // Agregar las menciones de ciclovía a las ubicaciones encontradas
    if (cicloviaMatches.length > 0) {
      allLocationMatches.push(...cicloviaMatches);
      console.log(`   🚴 Encontradas ${cicloviaMatches.length} menciones de ciclovía: ${cicloviaMatches.slice(0, 3).map(m => `"${m.trim()}"`).join(', ')}`);
    }
    
    // Mapeo de ubicaciones cercanas conocidas
    const nearbyLocationsMap = {
      'parque nacional': ['carrera séptima', 'carrera 7', 'cra 7', 'cra séptima', 'carrera séptima entre', 'carrera 7 entre', 'carrera séptima entre calles', 'carrera 7 entre calles', 'carrera 57', 'carrera 59', 'carrera 60', 'calle 36', 'calle 39', 'calle 44', 'calle 53', 'avenida calle 26', 'entre calles 36 y 39', 'calles 36 y 39'],
      'carrera séptima': ['parque nacional', 'parque', 'calle 36', 'calle 39', 'entre calles 36 y 39', 'calles 36 y 39'],
      'carrera 7': ['parque nacional', 'parque', 'calle 36', 'calle 39', 'entre calles 36 y 39', 'calles 36 y 39'],
      'el campín': ['movistar arena', 'arena', 'estadio', 'estadio nemesio camacho', 'estadio el campín', 'calle 57', 'calle 63', 'transversal 28', 'carrera 28', 'avenida nqs', 'avenida carrera 30'],
      'campín': ['movistar arena', 'arena', 'estadio', 'estadio nemesio camacho', 'estadio el campín', 'calle 57', 'calle 63', 'transversal 28', 'carrera 28', 'avenida nqs', 'avenida carrera 30'],
      'autopista norte': ['autonorte', 'nqs', 'avenida caracas', 'calle 80']
    };
    
    const nearbyLocations = userQuery ? (nearbyLocationsMap[userQueryNormalized] || nearbyLocationsMap[userQueryLower] || []) : [];
    const allRelevantTerms = userQuery ? [userQueryNormalized, ...nearbyLocations] : [];
    
    if (userQuery) {
      console.log(`   📍 Términos relevantes a buscar: ${allRelevantTerms.join(', ')}`);
    }
    
    // Filtrar ubicaciones relevantes
    const relevantLocations = allLocationMatches
      .map(loc => loc.trim())
      .filter(loc => {
        if (loc.length < 5 || loc.length > 150) return false;
        
        const locLower = loc.toLowerCase()
          .replace(/autonorte/gi, 'autopista norte')
          .replace(/nqs/gi, 'autopista norte')
          .replace(/el campín/gi, 'campín')
          .replace(/estadio nemesio camacho/gi, 'campín')
          .replace(/estadio el campín/gi, 'campín');
        
        // Si menciona "ciclovía", es siempre relevante (las ciclovías siempre afectan movilidad)
        const hasCiclovia = locLower.includes('ciclovía') || locLower.includes('ciclovia');
        if (hasCiclovia) {
          // Si hay búsqueda del usuario, verificar relevancia
          if (userQueryNormalized) {
            const hasRelevantLocation = allRelevantTerms.some(term => locLower.includes(term));
            // Si es "ciclovía de [ubicación relevante]", es siempre relevante
            if (hasRelevantLocation) {
              return true;
            }
            // Extraer la ubicación de la ciclovía (ej: "ciclovía de la carrera séptima" -> "carrera séptima")
            const cicloviaLocationMatch = locLower.match(/ciclovía\s+(?:de\s+)?(?:la\s+)?(carrera|calle|avenida|av\.|transversal|autopista)\s+[^\n\.\,\;]+/i);
            if (cicloviaLocationMatch) {
              const extractedLocation = cicloviaLocationMatch[0].replace(/ciclovía\s+(?:de\s+)?(?:la\s+)?/i, '').trim();
              // Verificar si la ubicación extraída es relevante para la búsqueda del usuario
              if (allRelevantTerms.some(term => extractedLocation.includes(term) || term.includes(extractedLocation.split(' ')[0]))) {
                return true;
              }
            }
          } else {
            // Si no hay búsqueda del usuario, todas las ciclovías son relevantes
            return true;
          }
        }
        
        // Verificar si la ubicación es relevante (sin ciclovía) - solo si hay búsqueda del usuario
        if (userQueryNormalized) {
          return allRelevantTerms.some(term => locLower.includes(term)) ||
                 (userQueryNormalized.includes('campín') && (locLower.includes('estadio') || locLower.includes('campín') || locLower.includes('movistar arena') || locLower.includes('arena') || locLower.includes('calle 57') || locLower.includes('calle 63') || locLower.includes('transversal 28') || locLower.includes('carrera 28')));
        }
        
        // Si no hay búsqueda del usuario, no incluir ubicaciones sin ciclovía
        return false;
      });
    
    const uniqueLocations = [...new Set(relevantLocations)].slice(0, 5);
    
    if (uniqueLocations.length > 0) {
      console.log(`   ✅ Encontradas ${uniqueLocations.length} ubicaciones relevantes: ${uniqueLocations.join(', ')}`);
      
      // Crear incidentes para cada ubicación relevante
      for (const locationName of uniqueLocations) {
        // Extraer contexto alrededor de la ubicación
        const locationIndex = bodyText.toLowerCase().indexOf(locationName.toLowerCase());
        let locationContext = '';
        
        if (locationIndex !== -1) {
          const startIndex = Math.max(0, locationIndex - 200);
          const endIndex = Math.min(bodyText.length, locationIndex + locationName.length + 200);
          locationContext = bodyText.substring(startIndex, endIndex).trim();
        } else {
          locationContext = bodyText.substring(0, 300).trim();
        }
        
        // Extraer información del evento (incluir ciclovía)
        const eventInfoPattern = /(?:evento|celebración|festival|concierto|marcha|manifestación|actividad|jornada|cierre|desvío|ciclovía|ciclovia)[^\n\.]{0,200}/gi;
        const eventInfoMatches = locationContext.match(eventInfoPattern) || [];
        const eventInfo = eventInfoMatches.length > 0 ? eventInfoMatches[0].substring(0, 200).trim() : '';
        
        // Extraer información específica de ciclovía
        const cicloviaPattern = new RegExp(`ciclovía.*?${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?(?:\\.|\\n|$)`, 'gi');
        const cicloviaMatches = bodyText.match(cicloviaPattern) || [];
        const cicloviaInfo = cicloviaMatches.length > 0 
          ? cicloviaMatches[0].substring(0, 200).trim()
          : '';
        
        // Extraer cierres específicos
        const closuresPattern = new RegExp(`(?:cierre|desvío|afecta|cerrado|bloqueado).*?${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?(?:\\.|\\n|$)`, 'gi');
        const closuresMatches = bodyText.match(closuresPattern) || [];
        const closuresInfo = closuresMatches.length > 0 
          ? closuresMatches[0].substring(0, 150).trim()
          : '';
        
        // Construir contenido específico
        let specificContent = '';
        if (cicloviaInfo) {
          // Si hay información de ciclovía, usarla (las ciclovías siempre afectan movilidad)
          specificContent = `Ciclovía en ${locationName}. ${cicloviaInfo}`;
        } else if (closuresInfo) {
          specificContent = closuresInfo;
        } else if (eventInfo) {
          specificContent = eventInfo;
        } else if (locationContext.length > 50) {
          specificContent = locationContext.substring(0, 200).trim();
        } else {
          specificContent = `Evento o celebración que puede afectar la movilidad en ${locationName}`;
        }
        
        // Si la ubicación menciona "ciclovía", agregar nota específica
        if (locationName.toLowerCase().includes('ciclovía') || locationName.toLowerCase().includes('ciclovia')) {
          specificContent += `. IMPORTANTE: Las ciclovías implican cierres de vías para permitir el paso de ciclistas y peatones, lo que afecta significativamente el tránsito vehicular.`;
        } else {
          specificContent += `. Se recomienda estar alerta en este sector ya que los eventos pueden generar cierres de vías o afectar el tránsito.`;
        }
        
        news.push({
          id: `bogota-news-event-${Date.now()}-${news.length}-${locationName.replace(/\s+/g, '-')}`,
          timestamp: new Date().toISOString(),
          title: `Evento en ${locationName} - Recomendación de movilidad`,
          content: specificContent,
          locations: [locationName],
          url: baseUrl,
          source: 'bogota.gov.co-news',
          type: 'evento'
        });
        
        console.log(`   ✅ Incidente de evento creado para "${locationName}"`);
      }
    } else {
      console.log(`   ⚠️ No se encontraron ubicaciones relevantes en el contenido del artículo`);
      
      // Si hay ciclovía en el contenido pero no se encontraron ubicaciones, intentar extraer la ubicación de la ciclovía
      if (hasCicloviaInContent) {
        console.log(`   🚴 Detectada mención de ciclovía en el contenido, intentando extraer ubicación...`);
        
        // Buscar patrones como "ciclovía de la carrera séptima", "ciclovía carrera séptima", etc.
        // Patrón mejorado para capturar mejor "carrera séptima", "carrera 7", etc.
        const cicloviaLocationPattern = /ciclovía\s+(?:de\s+)?(?:la\s+)?(carrera|calle|avenida|av\.|transversal|autopista)\s+([^\n\.\,\;]+?)(?:\s|\.|,|;|$)/gi;
        const cicloviaLocationMatches = [...bodyText.matchAll(cicloviaLocationPattern)];
        
        if (cicloviaLocationMatches.length > 0) {
          for (const match of cicloviaLocationMatches.slice(0, 3)) {
            const locationType = match[1];
            let locationName = match[2].trim();
            
            // Limpiar el nombre de la ubicación (remover palabras comunes al final)
            locationName = locationName.replace(/\s+(?:y|con|en|entre|hasta|desde|del|de la|de|la|el|los|las)\s*$/i, '').trim();
            
            const fullLocation = `${locationType} ${locationName}`;
            
            // Verificar si es relevante para la búsqueda del usuario (si hay búsqueda)
            const locationLower = fullLocation.toLowerCase();
            // Si hay búsqueda del usuario, verificar relevancia; si no hay búsqueda, todas las ciclovías son relevantes
            const isRelevant = !userQuery || (allRelevantTerms && allRelevantTerms.length > 0 && allRelevantTerms.some(term => locationLower.includes(term.toLowerCase())));
            
            if (isRelevant) {
              // Las ciclovías siempre afectan movilidad, crear incidente
              console.log(`   ✅ Ubicación de ciclovía encontrada: "${fullLocation}"`);
              
              // Extraer contexto de la ciclovía (buscar en un rango más amplio)
              const cicloviaIndex = bodyText.toLowerCase().indexOf(`ciclovía`);
              let cicloviaContext = '';
              
              if (cicloviaIndex !== -1) {
                const startIndex = Math.max(0, cicloviaIndex - 100);
                const endIndex = Math.min(bodyText.length, cicloviaIndex + 400);
                cicloviaContext = bodyText.substring(startIndex, endIndex).trim();
              } else {
                cicloviaContext = `Ciclovía en ${fullLocation}`;
              }
              
              // Limpiar HTML del nombre de la ubicación
              const cleanFullLocation = fullLocation.replace(/<[^>]*>/g, '').trim();
              
              news.push({
                id: `bogota-news-ciclovia-${Date.now()}-${news.length}-${cleanFullLocation.replace(/\s+/g, '-')}`,
                timestamp: new Date().toISOString(),
                title: `Ciclovía en ${cleanFullLocation} - Afecta movilidad`,
                content: `${cicloviaContext.substring(0, 300)}. IMPORTANTE: Las ciclovías implican cierres de vías para permitir el paso de ciclistas y peatones, lo que afecta significativamente el tránsito vehicular.`,
                locations: [cleanFullLocation],
                url: baseUrl,
                source: 'bogota.gov.co-news',
                type: 'evento'
              });
              
              console.log(`   ✅ Incidente de ciclovía creado para "${cleanFullLocation}"`);
            }
          }
        }
      }
    }
  }
  
  if (mainTitleMatch) {
    const mainTitleIndex = bodyText.indexOf(mainTitleMatch[0]);
    
    // Buscar desde el título principal hasta el final del contenido relevante
    const endPatterns = [
      /Te puede interesar/i,
      /Este contenido fue creado/i,
      /Si tienes alguna sugerencia/i,
      /Temas relacionados/i,
      /Contenidos Relacionados/i
    ];
    
    let endIndex = bodyText.length;
    for (const pattern of endPatterns) {
      const match = bodyText.substring(mainTitleIndex).match(pattern);
      if (match) {
        endIndex = mainTitleIndex + match.index;
        break;
      }
    }
    
    const relevantContent = bodyText.substring(mainTitleIndex, endIndex);
    
    // Buscar secciones de manifestaciones/incidentes
    // Patrón mejorado para detectar secciones que mencionan autopista norte, autonorte, nqs
    const manifestationSectionPattern = /(?:Manifestación|Accidente|Obra|Cierre|Desvío|Incidente|Corte|Actualización)\s+(?:en|de|sobre)\s+([^\n]+)/gi;
    const sectionMatches = Array.from(relevantContent.matchAll(manifestationSectionPattern));
    
    // También buscar secciones que mencionan directamente autopista norte/autonorte/nqs
    const autonorteSectionPattern = /(?:Manifestación|Accidente|Obra|Cierre|Desvío|Incidente|Corte|Actualización).*?(?:autopista\s+norte|autonorte|nqs)/gi;
    const autonorteSectionMatches = Array.from(relevantContent.matchAll(autonorteSectionPattern));
    
    // Combinar ambos tipos de secciones
    const allSectionMatches = [...sectionMatches, ...autonorteSectionMatches];
    const maxSections = Math.min(allSectionMatches.length, 10);
    
    for (let i = 0; i < maxSections; i++) {
      const sectionMatch = allSectionMatches[i];
      if (!sectionMatch) break;
      
      const sectionHeader = sectionMatch[0].trim();
      // Si el match tiene grupo capturado (location), usarlo; si no, extraer de la sección completa
      const location = sectionMatch[1] ? sectionMatch[1].trim() : sectionMatch[0].match(/(?:autopista\s+norte|autonorte|nqs|av\.|avenida|calle|carrera|transversal|localidad|sector|zona|vía|universidad|portal|aeropuerto)\s+[^\n]+/i)?.[0]?.trim() || '';
      const matchIndex = sectionMatch.index;
      
      const sectionStart = matchIndex;
      const nextSectionIndex = i < maxSections - 1 ? allSectionMatches[i + 1].index : relevantContent.length;
      const sectionEnd = Math.min(nextSectionIndex, sectionStart + 5000);
      
      const sectionContent = relevantContent.substring(sectionStart, sectionEnd);
      
      // Extraer todos los "Corte HH:MM a/p. m." de esta sección
      const cortePattern = /Corte\s+(\d{1,2}:\d{2}\s+[ap]\.?\s*m\.?)\s*([^\n]+(?:\n(?!Corte)[^\n]+)*)/gi;
      const corteMatches = Array.from(sectionContent.matchAll(cortePattern));
      const cortes = [];
      
      const maxCortes = Math.min(corteMatches.length, 20);
      
      for (let j = 0; j < maxCortes; j++) {
        const corteMatch = corteMatches[j];
        if (!corteMatch) break;
        
        const timestamp = corteMatch[1].trim();
        let corteText = corteMatch[2].trim();
        
        // Limpiar el texto
        corteText = corteText
          .replace(/<[^>]+>/g, '')
          .replace(/\{[^}]+\}/g, '')
          .replace(/console\.log\([^)]+\)/g, '')
          .replace(/#theme|#title|#label_display|#items|#formatter|#type|#text|#is_multiple/g, '')
          .replace(/["']/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Filtrar texto que no sea relevante
        if (corteText.length > 20 && 
            !/^(?:Mi ciudad|Servicios|Yo Participo|Así Vamos|Navega|Conoce|Buscador|Monitor Social|Consulta las estadísticas)/i.test(corteText) &&
            !corteText.includes('Aquí encontrarás noticias de cómo se están invirtiendo')) {
          cortes.push({ timestamp, text: corteText });
        }
      }
      
      // Crear un incidente por cada "Corte" relevante (validar con IA si hay userQuery)
      for (const corte of cortes) {
        // Validar cada corte con IA si hay búsqueda del usuario
        if (userQuery) {
          try {
            console.log(`🤖 Validando corte "${corte.timestamp}" con IA para búsqueda: "${userQuery}"`);
            const corteValidation = await validateMobilityReport({
              title: sectionHeader,
              content: corte.text,
              location: location,
              source: 'bogota.gov.co-news'
            }, userQuery);
            
            // Si el corte no es válido o no es relevante, omitirlo
            if (!corteValidation.isValid || (corteValidation.isRelevantToQuery === false)) {
              console.log(`⚠️ Corte descartado por validación de IA: ${corte.timestamp} - ${corteValidation.reason || 'No relevante'}`);
              continue;
            }
            
            console.log(`✅ Corte relevante validado: ${corte.timestamp} (confianza: ${corteValidation.confidence})`);
          } catch (error) {
            console.warn(`⚠️ Error validando corte con IA:`, error.message);
            // Continuar con el procesamiento normal si hay error
          }
        }
        
        // Extraer ubicaciones mencionadas en el corte
        // Patrón mejorado para detectar autopista norte, autonorte, nqs, etc.
        const locationPattern = /(?:av\.|avenida|calle|carrera|transversal|autopista|localidad|sector|zona|vía|universidad|portal|aeropuerto|autonorte|nqs)\s+[^\n\.\,\;]+(?:\s+(?:y|con|en)\s+(?:av\.|avenida|calle|carrera|transversal|autopista|localidad|sector|zona|vía|universidad|portal|aeropuerto|autonorte|nqs)\s+[^\n\.\,\;]+)*/gi;
        const locationMatches = corte.text.match(locationPattern) || [];
        
        // También buscar menciones directas de "autopista norte", "autonorte", "nqs"
        const autonortePattern = /\b(?:autopista\s+norte|autonorte|nqs)(?:\s+con\s+[^\n\.\,\;]+)?/gi;
        const autonorteMatches = corte.text.match(autonortePattern) || [];
        
        const allLocationTexts = [];
        
        // Agregar la ubicación principal de la sección
        if (location && location.trim().length > 5) {
          // Normalizar variaciones de autopista norte
          let normalizedLocation = location.trim()
            .replace(/autonorte/gi, 'autopista norte')
            .replace(/nqs/gi, 'autopista norte');
          allLocationTexts.push(normalizedLocation);
        }
        
        // Procesar ubicaciones encontradas en el texto
        for (const locMatch of locationMatches) {
          const parts = locMatch.split(/\s+(?:y|con)\s+/i);
          for (const part of parts) {
            let cleaned = part.trim();
            // Normalizar variaciones de autopista norte
            cleaned = cleaned
              .replace(/autonorte/gi, 'autopista norte')
              .replace(/nqs/gi, 'autopista norte');
            
            if (cleaned.length > 5 && 
                !allLocationTexts.includes(cleaned) &&
                !/^(?:villavicencio|medellín|cali|barranquilla|cartagena|bucaramanga|pereira|santa\s+marta|ibagué|manizales|armenia|pasto|valledupar|montería|neiva|riohacha|tunja|popayán|sincelejo|florencia|quibdó|arauca|yopal|mocoa|leticia|puerto\s+carreño|mitú|inírida)/i.test(cleaned) &&
                !/^(?:avenida|calle|carrera|vía|sector|zona|localidad)$/i.test(cleaned)) {
              allLocationTexts.push(cleaned);
            }
          }
        }
        
        // Procesar menciones directas de autopista norte/autonorte/nqs
        for (const autonorteMatch of autonorteMatches) {
          let cleaned = autonorteMatch.trim()
            .replace(/autonorte/gi, 'autopista norte')
            .replace(/nqs/gi, 'autopista norte');
          
          if (cleaned.length > 5 && !allLocationTexts.includes(cleaned)) {
            allLocationTexts.push(cleaned);
          }
        }
        
        // Crear un incidente por cada corte relevante (cada corte es una caja separada)
        // Si hay múltiples ubicaciones, crear un incidente por cada ubicación
        if (allLocationTexts.length > 1) {
          const uniqueLocations = [...new Set(allLocationTexts)];
          for (const locText of uniqueLocations) {
            news.push({
              id: `bogota-news-${Date.now()}-${news.length}-${i}-${cortes.indexOf(corte)}-${uniqueLocations.indexOf(locText)}`,
              timestamp: parseTimestamp(corte.timestamp),
              title: `${sectionHeader} - ${locText} (${corte.timestamp})`,
              content: corte.text.substring(0, 1000).trim(),
              locations: [locText],
              url: baseUrl, // Link de la fuente (artículo original)
              source: 'bogota.gov.co-news'
            });
          }
        } else {
          // Si solo hay una ubicación, crear un solo incidente por corte
          news.push({
            id: `bogota-news-${Date.now()}-${news.length}-${i}-${cortes.indexOf(corte)}`,
            timestamp: parseTimestamp(corte.timestamp),
            title: `${sectionHeader} (${corte.timestamp})`,
            content: corte.text.substring(0, 1000).trim(),
            locations: allLocationTexts.length > 0 ? allLocationTexts : [location],
            url: baseUrl, // Link de la fuente (artículo original)
            source: 'bogota.gov.co-news'
          });
        }
      }
    }
  }
  
  return news;
}
