import axios from 'axios';
import dotenv from 'dotenv';
import { getTwitterSources } from './sourcesService.js';
import { getCachedTweets, saveCachedTweets, getLatestTweetId } from '../database/incidents.js';
import { getApiStats, updateApiStats, incrementApiRequest } from '../database/apiStats.js';
import { getTwitterDataSource } from './configService.js';
import { getAllRecentTweetsByScraping } from './twitterScrapingService.js';

dotenv.config();

const TWITTER_API_URL = 'https://api.twitter.com/2';
const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

// Variable global para rastrear si el API está agotado
let apiUsageExceeded = false;
let apiUsageExceededUntil = null; // Timestamp hasta cuando está agotado

// Variables para rastrear el uso del API (en memoria para acceso rápido)
// Se sincronizan con la base de datos
let apiUsageStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  lastRequestTime: null,
  rateLimitRemaining: null,
  rateLimitReset: null,
  rateLimitLimit: null
};

// Cargar estadísticas desde la BD al iniciar
let statsLoaded = false;
async function loadStatsFromDB() {
  if (!statsLoaded) {
    try {
      const dbStats = await getApiStats();
      apiUsageStats = {
        totalRequests: dbStats.totalRequests,
        successfulRequests: dbStats.successfulRequests,
        failedRequests: dbStats.failedRequests,
        lastRequestTime: dbStats.lastRequestTime,
        rateLimitRemaining: dbStats.rateLimitRemaining,
        rateLimitReset: dbStats.rateLimitReset,
        rateLimitLimit: dbStats.rateLimitLimit
      };
      
      // Sincronizar también las variables de exceeded
      if (dbStats.apiExceeded && dbStats.apiExceededUntil) {
        apiUsageExceeded = dbStats.apiExceeded;
        apiUsageExceededUntil = new Date(dbStats.apiExceededUntil);
      }
      
      statsLoaded = true;
    } catch (error) {
      console.error('Error cargando estadísticas desde BD:', error);
    }
  }
}

/**
 * Obtiene el estado actual del API de Twitter
 * @returns {Promise<Object>} Estado del API
 */
export async function getApiStatus() {
  // Cargar estadísticas desde BD si no se han cargado
  await loadStatsFromDB();
  
  const now = new Date();
  const isExceeded = apiUsageExceeded && apiUsageExceededUntil && now < apiUsageExceededUntil;
  const timeUntilReset = isExceeded && apiUsageExceededUntil 
    ? Math.max(0, Math.ceil((apiUsageExceededUntil - now) / 1000 / 60)) // minutos
    : null;

  return {
    isExceeded,
    exceededUntil: apiUsageExceededUntil ? new Date(apiUsageExceededUntil).toISOString() : null,
    timeUntilResetMinutes: timeUntilReset,
    hasBearerToken: !!BEARER_TOKEN,
    usageStats: {
      ...apiUsageStats,
      lastRequestTime: apiUsageStats.lastRequestTime ? new Date(apiUsageStats.lastRequestTime).toISOString() : null,
      rateLimitReset: apiUsageStats.rateLimitReset ? new Date(apiUsageStats.rateLimitReset).toISOString() : null
    }
  };
}

/**
 * Actualiza las estadísticas de uso del API
 * @param {Object} response - Respuesta del API de Twitter (puede ser null en caso de error)
 * @param {Object} error - Error del API (opcional)
 */
async function updateApiUsageStats(response = null, error = null) {
  // Cargar estadísticas desde BD si no se han cargado
  await loadStatsFromDB();
  
  apiUsageStats.totalRequests++;
  apiUsageStats.lastRequestTime = Date.now();
  
  if (error) {
    // Es un error, incrementar failedRequests
    apiUsageStats.failedRequests++;
    
    // Si hay headers en el error (como en 429), intentar extraer rate limit info
    if (error.response && error.response.headers) {
      const remaining = error.response.headers['x-rate-limit-remaining'];
      const reset = error.response.headers['x-rate-limit-reset'];
      const limit = error.response.headers['x-rate-limit-limit'];
      
      if (remaining !== undefined) {
        apiUsageStats.rateLimitRemaining = parseInt(remaining) || null;
      }
      if (reset) {
        apiUsageStats.rateLimitReset = parseInt(reset) * 1000; // Convertir a milisegundos
      }
      if (limit) {
        apiUsageStats.rateLimitLimit = parseInt(limit) || null;
      }
    }
    
    // Guardar en BD
    await updateApiStats({
      totalRequests: apiUsageStats.totalRequests,
      successfulRequests: apiUsageStats.successfulRequests,
      failedRequests: apiUsageStats.failedRequests,
      lastRequestTime: apiUsageStats.lastRequestTime,
      rateLimitRemaining: apiUsageStats.rateLimitRemaining,
      rateLimitReset: apiUsageStats.rateLimitReset,
      rateLimitLimit: apiUsageStats.rateLimitLimit
    });
    
    // También incrementar contador en BD
    await incrementApiRequest(false);
  } else if (response && response.headers) {
    // Es una respuesta exitosa
    apiUsageStats.successfulRequests++;
    
    const remaining = response.headers['x-rate-limit-remaining'];
    const reset = response.headers['x-rate-limit-reset'];
    const limit = response.headers['x-rate-limit-limit'];
    
    if (remaining !== undefined) {
      apiUsageStats.rateLimitRemaining = parseInt(remaining) || null;
    }
    if (reset) {
      apiUsageStats.rateLimitReset = parseInt(reset) * 1000; // Convertir a milisegundos
    }
    if (limit) {
      apiUsageStats.rateLimitLimit = parseInt(limit) || null;
    }
    
    // Guardar en BD
    await updateApiStats({
      totalRequests: apiUsageStats.totalRequests,
      successfulRequests: apiUsageStats.successfulRequests,
      failedRequests: apiUsageStats.failedRequests,
      lastRequestTime: apiUsageStats.lastRequestTime,
      rateLimitRemaining: apiUsageStats.rateLimitRemaining,
      rateLimitReset: apiUsageStats.rateLimitReset,
      rateLimitLimit: apiUsageStats.rateLimitLimit
    });
    
    // También incrementar contador en BD
    await incrementApiRequest(true);
  } else {
    // Respuesta sin headers (poco común pero posible)
    apiUsageStats.successfulRequests++;
    
    // Guardar en BD
    await updateApiStats({
      totalRequests: apiUsageStats.totalRequests,
      successfulRequests: apiUsageStats.successfulRequests,
      failedRequests: apiUsageStats.failedRequests,
      lastRequestTime: apiUsageStats.lastRequestTime
    });
    
    // También incrementar contador en BD
    await incrementApiRequest(true);
  }
}

/**
 * Obtiene tweets recientes de las cuentas oficiales
 * @param {string} sector - Sector a buscar
 * @param {Object} coordinates - Coordenadas { lat, lng }
 * @returns {Promise<Array>} Array de tweets relevantes
 */
export async function getTweetsBySector(sector, coordinates) {
  try {
    // Verificar método configurado
    const dataSource = await getTwitterDataSource();
    
    // Si está configurado para usar datos mock, retornar directamente
    if (dataSource === 'mock') {
      console.log('📋 Usando datos mock para obtener tweets (configuración del sistema)');
      console.log('📋 NOTA: Los datos mock son la solución principal mientras el proyecto no tenga usuarios ni monetización.');
      console.log('📋 La API oficial de Twitter es muy cara ($175-$5000/mes) y no es viable en esta etapa.');
      return getMockTweets();
    }
    
    // Si está configurado para usar scraping, obtener todos y filtrar por sector
    if (dataSource === 'scraping') {
      console.log('🔍 Usando scraping para obtener tweets por sector (configuración del sistema)');
      
      // 1. PRIMERO: Intentar obtener tweets del cache local y filtrar por sector
      const cachedTweets = await getCachedTweets();
      
      // Filtrar tweets del cache que mencionen el sector
      const sectorLower = sector.toLowerCase();
      const sectorKeywords = sector.split(' ').filter(word => word.length > 3);
      const filteredCachedTweets = cachedTweets.filter(tweet => {
        const textLower = tweet.text.toLowerCase();
        // Verificar si el tweet menciona el sector o alguna palabra clave
        return textLower.includes(sectorLower) || 
               sectorKeywords.some(keyword => textLower.includes(keyword.toLowerCase()));
      });

      // Si hay suficientes tweets relevantes en cache (más de 5), usarlos directamente
      if (filteredCachedTweets.length >= 5) {
        console.log(`✅ Usando ${filteredCachedTweets.length} tweets del cache local para sector "${sector}" (scraping)`);
        return filteredCachedTweets;
      }
      
      // 2. Intentar obtener tweets mediante scraping
      try {
        const allTweets = await getAllRecentTweetsByScraping();
        
        if (allTweets.length > 0) {
          console.log(`✅ Scraping obtuvo ${allTweets.length} tweets`);
          // Filtrar tweets relevantes al sector (la lógica de filtrado se hace en mobilityService)
          return allTweets;
        } else {
          console.warn('⚠️ Scraping no obtuvo tweets, usando cache o mock como fallback');
        }
      } catch (error) {
        console.error('❌ Error en scraping:', error.message);
        console.warn('⚠️ Usando cache o mock como fallback debido a error en scraping');
      }
      
      // 3. Si el scraping falló o no obtuvo tweets, usar cache o mock
      if (filteredCachedTweets.length > 0) {
        console.log(`✅ Usando ${filteredCachedTweets.length} tweets del cache como fallback`);
        return filteredCachedTweets;
      }
      
      // 4. Si no hay cache, usar datos mock
      console.warn('⚠️ No hay tweets en cache, usando datos mock como fallback');
      return getMockTweets();
    }
    
    // Si está configurado para usar API, continuar con la lógica del API
    console.log('🔍 Usando Twitter API v2 para obtener tweets por sector (configuración del sistema)');
    
    // 1. PRIMERO: Intentar obtener tweets del cache local y filtrar por sector
    const cachedTweets = await getCachedTweets();
    
    // Filtrar tweets del cache que mencionen el sector
    const sectorLower = sector.toLowerCase();
    const sectorKeywords = sector.split(' ').filter(word => word.length > 3);
    const filteredCachedTweets = cachedTweets.filter(tweet => {
      const textLower = tweet.text.toLowerCase();
      // Verificar si el tweet menciona el sector o alguna palabra clave
      return textLower.includes(sectorLower) || 
             sectorKeywords.some(keyword => textLower.includes(keyword.toLowerCase()));
    });

    // Si hay suficientes tweets relevantes en cache (más de 3), usarlos directamente
    // Reducido de 5 a 3 para ser más permisivo y usar menos el API
    if (filteredCachedTweets.length >= 3) {
      console.log(`✅ Usando ${filteredCachedTweets.length} tweets del cache local para sector "${sector}" (últimas 24 horas, sin hacer request al API)`);
      console.log(`💡 Optimización: Cache extendido a 24 horas para minimizar el uso del API gratuito (100 posts/mes)`);
      return filteredCachedTweets;
    }

    // Si el API está agotado, usar cache local o mock
    if (apiUsageExceeded && apiUsageExceededUntil && new Date() < apiUsageExceededUntil) {
      console.warn('⚠️ API de Twitter agotado, usando cache local');
      if (filteredCachedTweets.length > 0) {
        return filteredCachedTweets;
      }
      console.warn('⚠️ No hay tweets en cache para este sector, usando modo mock');
      return getMockTweets();
    }
    
    // Resetear flag si ya pasó el tiempo
    if (apiUsageExceededUntil && new Date() >= apiUsageExceededUntil) {
      apiUsageExceeded = false;
      apiUsageExceededUntil = null;
      
      // Guardar en BD
      await updateApiStats({
        apiExceeded: false,
        apiExceededUntil: null
      });
      
      console.log('✅ API de Twitter disponible nuevamente');
    }
    
    if (!BEARER_TOKEN) {
      console.warn('⚠️ Twitter Bearer Token no configurado, usando cache local o mock');
      if (filteredCachedTweets.length > 0) {
        return filteredCachedTweets;
      }
      return getMockTweets();
    }

    // Obtener cuentas activas desde BD
    const accounts = await getTwitterSources();
    
    if (accounts.length === 0) {
      console.warn('⚠️ No hay cuentas Twitter activas en BD, usando cache local o mock');
      if (filteredCachedTweets.length > 0) {
        return filteredCachedTweets;
      }
      return getMockTweets();
    }

    // Construir query para buscar en todas las cuentas oficiales
    const accountsQuery = accounts.map(acc => `from:${acc}`).join(' OR ');
    
    // Buscar tweets que mencionen el sector o palabras relacionadas
    const keywordsQuery = sectorKeywords.length > 0 
      ? `(${sectorKeywords.join(' OR ')})` 
      : sector;

    const query = `(${accountsQuery}) ${keywordsQuery} -is:retweet lang:es`;
    
    console.log(`🔍 Buscando tweets del API para sector "${sector}" (cache tiene ${filteredCachedTweets.length} tweets relevantes)`);

    const response = await axios.get(`${TWITTER_API_URL}/tweets/search/recent`, {
      params: {
        query: query,
        max_results: 100, // Máximo permitido para obtener más tweets por request (optimizar uso del API)
        'tweet.fields': 'created_at,author_id,public_metrics',
        expansions: 'author_id'
      },
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    // Actualizar estadísticas de uso del API
    await updateApiUsageStats(response);

    if (response.data && response.data.data) {
      const apiTweets = response.data.data.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics
      }));

      console.log(`✅ Encontrados ${apiTweets.length} tweets del API para sector "${sector}"`);
      
      // Guardar los nuevos tweets en cache (todos los tweets, no solo los del sector)
      if (apiTweets.length > 0) {
        await saveCachedTweets(apiTweets);
      }

      // Combinar tweets del API con tweets del cache (eliminar duplicados)
      const allTweets = [...apiTweets];
      const cachedIds = new Set(apiTweets.map(t => t.id));
      
      for (const cachedTweet of filteredCachedTweets) {
        if (!cachedIds.has(cachedTweet.id)) {
          allTweets.push(cachedTweet);
        }
      }

      // Ordenar por fecha de creación (más recientes primero)
      allTweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      console.log(`✅ Retornando ${allTweets.length} tweets para sector "${sector}" (${apiTweets.length} del API + ${filteredCachedTweets.length} del cache)`);
      return allTweets;
    }

    // Si no hay tweets del API, retornar los del cache
    if (filteredCachedTweets.length > 0) {
      console.log(`✅ No hay tweets nuevos del API, usando ${filteredCachedTweets.length} tweets del cache para sector "${sector}"`);
      return filteredCachedTweets;
    }

    return [];
  } catch (error) {
    // Actualizar estadísticas de error
    updateApiUsageStats(null, error);
    
    const errorData = error.response?.data;
    
    // Detectar si excedió el límite de uso
    if (errorData?.title === 'UsageCapExceeded' || 
        errorData?.detail?.includes('Usage cap exceeded') ||
        error.response?.status === 429) {
      // Marcar como agotado por 24 horas (o hasta que se resetee el límite mensual)
      apiUsageExceeded = true;
      apiUsageExceededUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
      console.warn('⚠️ Límite de uso del API de Twitter excedido, usando modo mock por 24 horas');
      console.warn('⚠️ El sistema usará datos mock hasta que se resetee el límite mensual');
      return getMockTweets();
    }
    
    // Si hay error de autenticación, usar mock
    if (error.response?.status === 401) {
      console.warn('⚠️ Error de autenticación Twitter, usando modo mock');
      return getMockTweets();
    }
    
    console.error('Error obteniendo tweets:', errorData || error.message);
    
    // Por defecto, usar mock en caso de error para no bloquear la aplicación
    console.warn('⚠️ Error al obtener tweets, usando modo mock');
    return getMockTweets();
  }
}

/**
 * Obtiene todos los tweets recientes de las cuentas oficiales sin filtrar por sector
 * Usa el método configurado (API o scraping)
 * @returns {Promise<Array>} Array de tweets
 */
export async function getAllRecentTweets() {
  try {
    // Verificar método configurado
    const dataSource = await getTwitterDataSource();
    
    // Si está configurado para usar datos mock, retornar directamente
    if (dataSource === 'mock') {
      console.log('📋 Usando datos mock para obtener tweets (configuración del sistema)');
      console.log('📋 NOTA: Los datos mock son la solución principal mientras el proyecto no tenga usuarios ni monetización.');
      return getMockTweets();
    }
    
    // Si está configurado para usar scraping, usar scraping
    if (dataSource === 'scraping') {
      console.log('🔍 Usando scraping para obtener tweets (configuración del sistema)');
      return await getAllRecentTweetsByScraping();
    }
    
    // Si está configurado para usar API, continuar con la lógica del API
    console.log('🔍 Usando Twitter API v2 para obtener tweets (configuración del sistema)');
    // Si el API está agotado, usar cache local primero
    if (apiUsageExceeded && apiUsageExceededUntil && new Date() < apiUsageExceededUntil) {
      console.warn('⚠️ API de Twitter agotado, usando cache local');
      const cachedTweets = await getCachedTweets();
      if (cachedTweets.length > 0) {
        console.log(`✅ Usando ${cachedTweets.length} tweets del cache local`);
        return cachedTweets;
      }
      console.warn('⚠️ No hay tweets en cache, usando modo mock');
      return getMockTweets();
    }
    
    // Resetear flag si ya pasó el tiempo
    if (apiUsageExceededUntil && new Date() >= apiUsageExceededUntil) {
      apiUsageExceeded = false;
      apiUsageExceededUntil = null;
      
      // Guardar en BD
      await updateApiStats({
        apiExceeded: false,
        apiExceededUntil: null
      });
      
      console.log('✅ API de Twitter disponible nuevamente');
    }

    // 1. PRIMERO: Intentar obtener tweets del cache local (últimas 24 horas)
    // NOTA: Cache extendido a 24 horas para optimizar el uso del API gratuito (100 posts/mes)
    const cachedTweets = await getCachedTweets();
    
    // Si hay suficientes tweets en cache (más de 5), usarlos directamente
    // Reducido de 10 a 5 para ser más permisivo y usar menos el API
    if (cachedTweets.length >= 5) {
      console.log(`✅ Usando ${cachedTweets.length} tweets del cache local (últimas 24 horas, sin hacer request al API)`);
      console.log(`💡 Optimización: Cache extendido a 24 horas para minimizar el uso del API gratuito (100 posts/mes)`);
      return cachedTweets;
    }

    // 2. Si no hay suficientes tweets en cache, obtener del API
    if (!BEARER_TOKEN) {
      console.warn('⚠️ Twitter Bearer Token no configurado, usando cache local o mock');
      if (cachedTweets.length > 0) {
        return cachedTweets;
      }
      return getMockTweets();
    }

    // Obtener cuentas activas desde BD
    const accounts = await getTwitterSources();
    
    if (accounts.length === 0) {
      console.warn('⚠️ No hay cuentas Twitter activas en BD, usando cache local o mock');
      if (cachedTweets.length > 0) {
        return cachedTweets;
      }
      return getMockTweets();
    }

    // Obtener el ID del tweet más reciente en cache para solo obtener tweets nuevos
    const latestTweetId = await getLatestTweetId();

    // Construir query para buscar en todas las cuentas oficiales
    const accountsQuery = accounts.map(acc => `from:${acc}`).join(' OR ');
    
    // Buscar todos los tweets recientes (sin filtro de sector)
    const query = `(${accountsQuery}) -is:retweet lang:es`;
    
    console.log(`🔍 Buscando tweets recientes del API (cache tiene ${cachedTweets.length} tweets)`);

    const params = {
      query: query,
        max_results: 100, // Máximo permitido para obtener más tweets por request (optimizar uso del API)
      'tweet.fields': 'created_at,author_id,public_metrics',
      expansions: 'author_id'
    };

    // Solo obtener tweets más recientes que el más reciente en cache (si existe)
    if (latestTweetId) {
      params.since_id = latestTweetId;
      console.log(`🔍 Buscando tweets nuevos desde ID: ${latestTweetId}`);
    }

    const response = await axios.get(`${TWITTER_API_URL}/tweets/search/recent`, {
      params: params,
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    // Actualizar estadísticas de uso del API
    await updateApiUsageStats(response);

    if (response.data && response.data.data) {
      const apiTweets = response.data.data.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics
      }));

      console.log(`✅ Encontrados ${apiTweets.length} tweets nuevos del API`);
      
      // 3. Guardar los nuevos tweets en cache
      if (apiTweets.length > 0) {
        await saveCachedTweets(apiTweets);
      }

      // 4. Combinar tweets del API con tweets del cache (eliminar duplicados)
      const allTweets = [...apiTweets];
      const cachedIds = new Set(apiTweets.map(t => t.id));
      
      for (const cachedTweet of cachedTweets) {
        if (!cachedIds.has(cachedTweet.id)) {
          allTweets.push(cachedTweet);
        }
      }

      // Ordenar por fecha de creación (más recientes primero)
      allTweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      console.log(`✅ Retornando ${allTweets.length} tweets (${apiTweets.length} nuevos + ${cachedTweets.length} del cache)`);
      return allTweets;
    }

    // Si no hay tweets del API, retornar los del cache
    if (cachedTweets.length > 0) {
      console.log(`✅ No hay tweets nuevos del API, usando ${cachedTweets.length} tweets del cache`);
      return cachedTweets;
    }

    return [];
  } catch (error) {
    // Actualizar estadísticas de error
    updateApiUsageStats(null, error);
    
    const errorData = error.response?.data;
    
    // Detectar si excedió el límite de uso
    if (errorData?.title === 'UsageCapExceeded' || 
        errorData?.detail?.includes('Usage cap exceeded') ||
        error.response?.status === 429) {
      // Marcar como agotado por 24 horas (o hasta que se resetee el límite mensual)
      apiUsageExceeded = true;
      apiUsageExceededUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
      console.warn('⚠️ Límite de uso del API de Twitter excedido, usando modo mock por 24 horas');
      console.warn('⚠️ El sistema usará datos mock hasta que se resetee el límite mensual');
      return getMockTweets();
    }
    
    // Si hay error de autenticación, usar mock
    if (error.response?.status === 401) {
      console.warn('⚠️ Error de autenticación Twitter, usando modo mock');
      return getMockTweets();
    }
    
    console.error('Error obteniendo tweets generales:', errorData || error.message);
    
    // Por defecto, usar mock en caso de error para no bloquear la aplicación
    console.warn('⚠️ Error al obtener tweets, usando modo mock');
    return getMockTweets();
  }
}

/**
 * Tweets mock para desarrollo/testing
 * NOTA: Estos datos mock son la solución principal mientras el proyecto no tenga usuarios ni monetización.
 * La API oficial de Twitter es muy cara ($175-$5000/mes) y no es viable en esta etapa.
 * Cuando el proyecto tenga usuarios y monetización, se puede considerar usar la API oficial.
 * 
 * Variedad de tweets realistas de diferentes sectores de Bogotá para demostrar el proyecto.
 */
function getMockTweets() {
  const now = Date.now();
  const mockTweets = [
    // Puente Aranda
    {
      id: `mock-${now}-1`,
      text: `[05:10 p. m.] #MovilidadAhora | Siniestro entre motociclista y peatón, en la localidad de Puente Aranda, en la Av. Américas con carrera 56, en sentido occidente - oriente. Unidad de @TransitoBta y ambulancia asignadas.`,
      author_id: 'BogotaTransito',
      created_at: new Date(now - 7200000).toISOString(), // 2 horas atrás
      public_metrics: { retweet_count: 14, like_count: 39 }
    },
    {
      id: `mock-${now}-2`,
      text: `⚠️ Alerta de movilidad en Puente Aranda. Av. Américas con carrera 56 presenta tráfico lento por incidente vial. Usuarios pueden usar vías alternas.`,
      author_id: 'SectorMovilidad',
      created_at: new Date(now - 5400000).toISOString(), // 1.5 horas atrás
      public_metrics: { retweet_count: 20, like_count: 45 }
    },
    {
      id: `mock-${now}-3`,
      text: `📍 Puente Aranda: Cierre parcial en Av. Américas por obras de mantenimiento. Se recomienda usar Autopista Sur como alternativa.`,
      author_id: 'BogotaTransito',
      created_at: new Date(now - 10800000).toISOString(), // 3 horas atrás
      public_metrics: { retweet_count: 12, like_count: 28 }
    },
    // Avenida Boyacá
    {
      id: `mock-${now}-4`,
      text: `⚠️ Manifestación en Avenida Boyacá con Calle 72. Servicios de TransMilenio con desvíos. Evita el sector. #MovilidadBogotá`,
      author_id: 'SectorMovilidad',
      created_at: new Date(now - 1800000).toISOString(), // 30 minutos atrás
      public_metrics: { retweet_count: 50, like_count: 120 }
    },
    {
      id: `mock-${now}-5`,
      text: `📍 Av. Boyacá cerrada por manifestación. Rutas zonales activan desvíos. Usuarios afectados: 45,000 aproximadamente.`,
      author_id: 'BogotaTransito',
      created_at: new Date(now - 3600000).toISOString(), // 1 hora atrás
      public_metrics: { retweet_count: 30, like_count: 80 }
    },
    // Autopista Norte
    {
      id: `mock-${now}-6`,
      text: `🚗 Accidente en Autopista Norte con Calle 170. Tráfico lento en dirección norte. Usa vías alternas.`,
      author_id: 'BogotaTransito',
      created_at: new Date(now - 5400000).toISOString(), // 1.5 horas atrás
      public_metrics: { retweet_count: 25, like_count: 65 }
    },
    {
      id: `mock-${now}-7`,
      text: `🚧 Obras de mantenimiento en Autopista Norte entre Calle 100 y 170. Un carril cerrado. Tránsito fluido pero con precaución.`,
      author_id: 'TransMilenio',
      created_at: new Date(now - 7200000).toISOString(), // 2 horas atrás
      public_metrics: { retweet_count: 15, like_count: 40 }
    },
    // Calle 72
    {
      id: `mock-${now}-8`,
      text: `🚧 Obras menores en Calle 72. Un carril cerrado. Tránsito fluido pero con precaución.`,
      author_id: 'TransMilenio',
      created_at: new Date(now - 7200000).toISOString(), // 2 horas atrás
      public_metrics: { retweet_count: 15, like_count: 40 }
    },
    // Carrera 7
    {
      id: `mock-${now}-9`,
      text: `✅ Vía libre en Carrera 7 entre Calle 100 y 72. Tránsito normal. #MovilidadBogotá`,
      author_id: 'SectorMovilidad',
      created_at: new Date(now - 900000).toISOString(), // 15 minutos atrás
      public_metrics: { retweet_count: 10, like_count: 30 }
    },
    // TransMilenio
    {
      id: `mock-${now}-10`,
      text: `🚇 Servicio normal en todas las líneas de TransMilenio. Sin novedades reportadas.`,
      author_id: 'TransMilenio',
      created_at: new Date(now - 2700000).toISOString(), // 45 minutos atrás
      public_metrics: { retweet_count: 8, like_count: 20 }
    },
    // Kennedy
    {
      id: `mock-${now}-11`,
      text: `⚠️ Desvío temporal en Av. Primero de Mayo con Calle 40, localidad de Kennedy. Obras de mantenimiento de acueducto.`,
      author_id: 'BogotaTransito',
      created_at: new Date(now - 4500000).toISOString(), // 1.25 horas atrás
      public_metrics: { retweet_count: 18, like_count: 35 }
    },
    // Chapinero
    {
      id: `mock-${now}-12`,
      text: `🚗 Colisión menor en Carrera 13 con Calle 63, localidad de Chapinero. Tráfico lento en ambos sentidos.`,
      author_id: 'SectorMovilidad',
      created_at: new Date(now - 3600000).toISOString(), // 1 hora atrás
      public_metrics: { retweet_count: 22, like_count: 48 }
    },
    // Usaquén
    {
      id: `mock-${now}-13`,
      text: `🚧 Cierre parcial en Autopista Norte con Calle 127, localidad de Usaquén. Obras de mantenimiento de alcantarillado.`,
      author_id: 'BogotaTransito',
      created_at: new Date(now - 6300000).toISOString(), // 1.75 horas atrás
      public_metrics: { retweet_count: 16, like_count: 32 }
    },
    // Suba
    {
      id: `mock-${now}-14`,
      text: `📍 Localidad de Suba: Manifestación en Av. Suba con Calle 145. Tráfico lento. Se recomienda usar vías alternas.`,
      author_id: 'SectorMovilidad',
      created_at: new Date(now - 2700000).toISOString(), // 45 minutos atrás
      public_metrics: { retweet_count: 28, like_count: 55 }
    },
    // Engativá
    {
      id: `mock-${now}-15`,
      text: `🚗 Accidente en Av. 68 con Calle 80, localidad de Engativá. Tráfico lento en dirección occidente.`,
      author_id: 'BogotaTransito',
      created_at: new Date(now - 1800000).toISOString(), // 30 minutos atrás
      public_metrics: { retweet_count: 19, like_count: 42 }
    },
    // Fontibón
    {
      id: `mock-${now}-16`,
      text: `🚧 Obras de mantenimiento en Av. El Dorado con Calle 13, localidad de Fontibón. Un carril cerrado.`,
      author_id: 'TransMilenio',
      created_at: new Date(now - 5400000).toISOString(), // 1.5 horas atrás
      public_metrics: { retweet_count: 13, like_count: 25 }
    },
    // Bosa
    {
      id: `mock-${now}-17`,
      text: `⚠️ Alerta de movilidad en localidad de Bosa. Av. Bosa con Calle 50 presenta tráfico lento por obras viales.`,
      author_id: 'SectorMovilidad',
      created_at: new Date(now - 3600000).toISOString(), // 1 hora atrás
      public_metrics: { retweet_count: 17, like_count: 38 }
    },
    // Ciudad Bolívar
    {
      id: `mock-${now}-18`,
      text: `📍 Localidad de Ciudad Bolívar: Cierre temporal en Av. Ciudad de Cali con Calle 62. Obras de mantenimiento.`,
      author_id: 'BogotaTransito',
      created_at: new Date(now - 7200000).toISOString(), // 2 horas atrás
      public_metrics: { retweet_count: 14, like_count: 29 }
    },
    // San Cristóbal
    {
      id: `mock-${now}-19`,
      text: `🚗 Siniestro en Av. Caracas con Calle 1 Sur, localidad de San Cristóbal. Tráfico lento en ambos sentidos.`,
      author_id: 'SectorMovilidad',
      created_at: new Date(now - 4500000).toISOString(), // 1.25 horas atrás
      public_metrics: { retweet_count: 21, like_count: 44 }
    },
    // Usme
    {
      id: `mock-${now}-20`,
      text: `🚧 Obras de mantenimiento en Av. Caracas con Calle 50 Sur, localidad de Usme. Un carril cerrado.`,
      author_id: 'TransMilenio',
      created_at: new Date(now - 6300000).toISOString(), // 1.75 horas atrás
      public_metrics: { retweet_count: 15, like_count: 33 }
    }
  ];
  
  // Retornar 5-8 tweets aleatorios para simular variabilidad y mostrar más contenido
  const randomCount = Math.floor(Math.random() * 4) + 5; // 5 a 8 tweets
  const shuffled = mockTweets.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, randomCount);
}
