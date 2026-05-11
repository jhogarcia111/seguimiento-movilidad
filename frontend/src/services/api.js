import axios from 'axios';

/**
 * Determina la URL base del API automáticamente
 * - Si estamos en una URL pública de Cursor (devtunnels.ms), usa la URL pública del backend
 * - Si estamos en una IP de red local, usa la misma IP con puerto 3051
 * - Si estamos en localhost, usa localhost:3051
 */
function getApiBaseUrl() {
  // Si hay una variable de entorno configurada, usarla
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const currentHost = window.location.hostname;
  const protocol = window.location.protocol;
  const currentPort = window.location.port;

  // Mismo dominio: Vercel Services (vercel.json → backend en /_/backend)
  if (import.meta.env.PROD && currentHost.endsWith('.vercel.app')) {
    return `${protocol}//${currentHost}/_/backend`;
  }

  // Si estamos en una URL pública de Cursor
  if (currentHost.includes('devtunnels.ms') || currentHost.includes('tunnels.cursor.com')) {
    // Construir la URL del backend basada en la URL del frontend
    // Ejemplo: https://3grls1xt-4051.use.devtunnels.ms -> https://3grls1xt-3051.use.devtunnels.ms
    const portMatch = currentHost.match(/-(\d+)\./);
    
    if (portMatch) {
      // Reemplazar el puerto del frontend (4051) con el puerto del backend (3051)
      const backendHost = currentHost.replace(/-4051\./, '-3051.');
      return `${protocol}//${backendHost}`;
    }
    
    // Fallback: intentar construir URL basada en el patrón conocido
    const hostParts = currentHost.split('.');
    if (hostParts.length > 0) {
      // Reemplazar cualquier puerto con 3051
      hostParts[0] = hostParts[0].replace(/-\d+$/, '-3051');
      const backendHost = hostParts.join('.');
      return `${protocol}//${backendHost}`;
    }
  }

  // Detectar si estamos en una IP de red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  const ipPattern = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/;
  if (ipPattern.test(currentHost)) {
    // Usar la misma IP pero con el puerto del backend (3051)
    return `${protocol}//${currentHost}:3051`;
  }

  // Si estamos en localhost o 127.0.0.1
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return 'http://localhost:3051';
  }

  // Default: usar el mismo hostname pero con puerto 3051
  return `${protocol}//${currentHost}:3051`;
}

const API_BASE_URL = getApiBaseUrl();

// Log para debugging (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log('🌐 API Base URL:', API_BASE_URL);
  console.log('📍 Current Hostname:', window.location.hostname);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Busca problemas de movilidad por sector
 * @param {string|Object} sector - Nombre del sector o objeto con sector, lat, lng
 * @returns {Promise<Object>} Resultados de búsqueda
 */
export async function searchMobilityBySector(sector) {
  try {
    let params = {};
    let sectorName = '';
    
    if (typeof sector === 'object' && sector !== null) {
      // Si es objeto, puede tener lat y lng
      sectorName = sector.sector || 'Mi Ubicación';
      params.sector = sectorName;
      if (sector.lat) params.lat = sector.lat;
      if (sector.lng) params.lng = sector.lng;
    } else {
      sectorName = sector || '';
      params.sector = sectorName;
    }

    const response = await api.get('/api/mobility/sector', { params });
    
    return {
      incidents: response.data.results?.incidents || [],
      coordinates: response.data.results?.coordinates || null,
      source: response.data.results?.source || 'api',
      sector: sectorName,
      isMock: response.data.results?.isMock || false
    };
  } catch (error) {
    console.error('Error en searchMobilityBySector:', error);
    throw new Error(
      error.response?.data?.error || 
      'Error al buscar información de movilidad'
    );
  }
}

/**
 * Obtiene problemas generales de movilidad en Bogotá
 * @returns {Promise<Object>} Resultados generales con todos los incidentes
 */
export async function getGeneralMobilityProblems() {
  try {
    const response = await api.get('/api/mobility/general', {
      timeout: 35000 // 35 segundos para dar tiempo suficiente
    });
    
    return {
      incidents: response.data.results?.incidents || [],
      source: response.data.results?.source || 'api',
      count: response.data.results?.count || 0,
      last_updated: response.data.last_updated,
      isMock: response.data.results?.isMock || false
    };
  } catch (error) {
    console.error('Error en getGeneralMobilityProblems:', error);
    
    // Mensajes más específicos según el tipo de error
    let errorMessage = 'Error al obtener problemas generales de movilidad';
    
    if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      errorMessage = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'El servidor tardó demasiado en responder. Intenta nuevamente.';
    } else if (error.response) {
      errorMessage = error.response.data?.error || `Error del servidor (${error.response.status})`;
    }
    
    throw new Error(errorMessage);
  }
}

export default api;
