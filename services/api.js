import axios from 'axios';

/**
 * En el monorepo Next.js todo vive en el mismo dominio:
 *  - El frontend renderiza en `/`, `/login`, etc.
 *  - Los Route Handlers están bajo `/api/...`
 * Por eso usamos rutas relativas (baseURL vacía) y axios resolverá contra `window.location.origin`.
 *
 * En SSR (window indefinido) caemos en cadena vacía igualmente — los clientes que importan este
 * módulo deberían ser componentes cliente.
 */
function getApiBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return '';
}

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Busca problemas de movilidad por sector
 * @param {string|Object} sector - Nombre del sector o objeto con sector, lat, lng
 */
export async function searchMobilityBySector(sector) {
  try {
    const params = {};
    let sectorName = '';
    if (typeof sector === 'object' && sector !== null) {
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
      isMock: response.data.results?.isMock || false,
    };
  } catch (error) {
    console.error('Error en searchMobilityBySector:', error);
    throw new Error(error.response?.data?.error || 'Error al buscar información de movilidad');
  }
}

/**
 * Obtiene problemas generales de movilidad en Bogotá
 */
export async function getGeneralMobilityProblems() {
  try {
    const response = await api.get('/api/mobility/general', { timeout: 35000 });
    return {
      incidents: response.data.results?.incidents || [],
      source: response.data.results?.source || 'api',
      count: response.data.results?.count || 0,
      last_updated: response.data.last_updated,
      isMock: response.data.results?.isMock || false,
    };
  } catch (error) {
    console.error('Error en getGeneralMobilityProblems:', error);
    let errorMessage = 'Error al obtener problemas generales de movilidad';
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
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
