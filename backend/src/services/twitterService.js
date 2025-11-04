import axios from 'axios';
import dotenv from 'dotenv';
import { getTwitterSources } from './sourcesService.js';

dotenv.config();

const TWITTER_API_URL = 'https://api.twitter.com/2';
const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

/**
 * Obtiene tweets recientes de las cuentas oficiales
 * @param {string} sector - Sector a buscar
 * @param {Object} coordinates - Coordenadas { lat, lng }
 * @returns {Promise<Array>} Array de tweets relevantes
 */
export async function getTweetsBySector(sector, coordinates) {
  try {
    if (!BEARER_TOKEN) {
      console.warn('⚠️ Twitter Bearer Token no configurado, usando modo mock');
      return getMockTweets();
    }

    // Obtener cuentas activas desde BD
    const accounts = await getTwitterSources();
    
    if (accounts.length === 0) {
      console.warn('⚠️ No hay cuentas Twitter activas en BD, usando mock');
      return getMockTweets();
    }

    // Construir query para buscar en todas las cuentas oficiales
    const accountsQuery = accounts.map(acc => `from:${acc}`).join(' OR ');
    
    // Buscar tweets que mencionen el sector o palabras relacionadas
    const sectorKeywords = sector.split(' ').filter(word => word.length > 3);
    const keywordsQuery = sectorKeywords.length > 0 
      ? `(${sectorKeywords.join(' OR ')})` 
      : sector;

    const query = `(${accountsQuery}) ${keywordsQuery} -is:retweet lang:es`;
    
    console.log(`🔍 Buscando tweets con query: ${query}`);

    const response = await axios.get(`${TWITTER_API_URL}/tweets/search/recent`, {
      params: {
        query: query,
        max_results: 50,
        'tweet.fields': 'created_at,author_id,public_metrics',
        expansions: 'author_id'
      },
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    if (response.data && response.data.data) {
      console.log(`✅ Encontrados ${response.data.data.length} tweets`);
      return response.data.data.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics
      }));
    }

    return [];
  } catch (error) {
    console.error('Error obteniendo tweets:', error.response?.data || error.message);
    
    // Si hay error de autenticación, usar mock
    if (error.response?.status === 401) {
      console.warn('⚠️ Error de autenticación Twitter, usando modo mock');
      return getMockTweets();
    }
    
    return [];
  }
}

/**
 * Obtiene todos los tweets recientes de las cuentas oficiales sin filtrar por sector
 * @returns {Promise<Array>} Array de tweets
 */
export async function getAllRecentTweets() {
  try {
    if (!BEARER_TOKEN) {
      console.warn('⚠️ Twitter Bearer Token no configurado, usando modo mock');
      return getMockTweets();
    }

    // Obtener cuentas activas desde BD
    const accounts = await getTwitterSources();
    
    if (accounts.length === 0) {
      console.warn('⚠️ No hay cuentas Twitter activas en BD, usando mock');
      return getMockTweets();
    }

    // Construir query para buscar en todas las cuentas oficiales
    const accountsQuery = accounts.map(acc => `from:${acc}`).join(' OR ');
    
    // Buscar todos los tweets recientes (sin filtro de sector)
    const query = `(${accountsQuery}) -is:retweet lang:es`;
    
    console.log(`🔍 Buscando todos los tweets recientes con query: ${query}`);

    const response = await axios.get(`${TWITTER_API_URL}/tweets/search/recent`, {
      params: {
        query: query,
        max_results: 100, // Más resultados para general
        'tweet.fields': 'created_at,author_id,public_metrics',
        expansions: 'author_id'
      },
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    if (response.data && response.data.data) {
      console.log(`✅ Encontrados ${response.data.data.length} tweets generales`);
      return response.data.data.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics
      }));
    }

    return [];
  } catch (error) {
    console.error('Error obteniendo tweets generales:', error.response?.data || error.message);
    
    // Si hay error de autenticación, usar mock
    if (error.response?.status === 401) {
      console.warn('⚠️ Error de autenticación Twitter, usando modo mock');
      return getMockTweets();
    }
    
    return [];
  }
}

/**
 * Tweets mock para desarrollo/testing
 */
function getMockTweets() {
  return [
    {
      id: 'mock-1',
      text: `⚠️ Manifestación en Avenida Boyacá con Calle 72. Servicios de TransMilenio con desvíos. Evita el sector. #MovilidadBogotá`,
      author_id: 'SectorMovilidad',
      created_at: new Date().toISOString(),
      public_metrics: { retweet_count: 50, like_count: 120 }
    },
    {
      id: 'mock-2',
      text: `📍 Av. Boyacá cerrada por manifestación. Rutas zonales activan desvíos. Usuarios afectados: 45,000 aproximadamente.`,
      author_id: 'BogotaTransito',
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
      public_metrics: { retweet_count: 30, like_count: 80 }
    },
    {
      id: 'mock-3',
      text: `🚧 Obras menores en Calle 72. Un carril cerrado. Tránsito fluido pero con precaución.`,
      author_id: 'TransMilenio',
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 horas atrás
      public_metrics: { retweet_count: 15, like_count: 40 }
    }
  ];
}
