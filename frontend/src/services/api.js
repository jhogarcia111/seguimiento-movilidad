import axios from 'axios';

/**
 * Determina la URL base del API automáticamente
 * - Si estamos en una URL pública de Cursor (devtunnels.ms), usa la URL pública del backend
 * - Si estamos en localhost, usa localhost:3051
 */
function getApiBaseUrl() {
  // Si hay una variable de entorno configurada, usarla
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Detectar si estamos en una URL pública de Cursor (devtunnels.ms)
  const currentHost = window.location.hostname;
  
  // Si estamos en una URL pública de Cursor
  if (currentHost.includes('devtunnels.ms') || currentHost.includes('tunnels.cursor.com')) {
    // Construir la URL del backend basada en la URL del frontend
    // Ejemplo: https://3grls1xt-4051.use.devtunnels.ms -> https://3grls1xt-3051.use.devtunnels.ms
    const protocol = window.location.protocol;
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

  // Default: localhost para desarrollo local
  return 'http://localhost:3051';
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
      sector: sectorName
    };
  } catch (error) {
    console.error('Error en searchMobilityBySector:', error);
    throw new Error(
      error.response?.data?.error || 
      'Error al buscar información de movilidad'
    );
  }
}

export default api;
