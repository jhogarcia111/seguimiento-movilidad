import { getDatabase } from './db.js';

/**
 * Obtiene incidentes cacheados para un sector
 */
export async function getCachedIncidents(sector, coordinates) {
  try {
    const pool = getDatabase();
    const now = new Date().toISOString();

    const [rows] = await pool.execute(`
      SELECT incident_data 
      FROM incidents 
      WHERE sector = ? 
        AND expires_at > ?
        AND (
          (latitude IS NULL AND longitude IS NULL) OR
          (ABS(latitude - ?) < 0.01 AND ABS(longitude - ?) < 0.01)
        )
      ORDER BY created_at DESC
      LIMIT 1
    `, [sector, now, coordinates.lat, coordinates.lng]);

    if (rows && rows.length > 0 && rows[0].incident_data) {
      try {
        const parsed = JSON.parse(rows[0].incident_data);
        // Asegurar que sea un array
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error('Error parseando incident_data:', error);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Error obteniendo incidentes cacheados:', error);
    return null;
  }
}

/**
 * Guarda incidentes en cache
 */
export async function saveCachedIncidents(sector, coordinates, incidents) {
  try {
    const pool = getDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (4 * 60 * 60 * 1000)); // 4 horas

    const incidentData = JSON.stringify(incidents);

    await pool.execute(`
      INSERT INTO incidents (sector, latitude, longitude, incident_data, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [sector, coordinates.lat, coordinates.lng, incidentData, expiresAt.toISOString()]);

    console.log(`✅ Incidentes guardados en cache para sector: ${sector}`);
  } catch (error) {
    console.error('Error guardando incidentes en cache:', error);
    throw error;
  }
}

/**
 * Obtiene scraping cacheado
 */
export async function getCachedScraping() {
  try {
    const pool = getDatabase();
    const now = new Date().toISOString();

    const [rows] = await pool.execute(`
      SELECT data, created_at
      FROM scraping_cache
      WHERE expires_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [now]);

    if (rows && rows.length > 0 && rows[0].data) {
      try {
        return {
          data: JSON.parse(rows[0].data),
          timestamp: rows[0].created_at
        };
      } catch (error) {
        console.error('Error parseando scraping cache:', error);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Error obteniendo scraping cache:', error);
    return null;
  }
}

/**
 * Guarda scraping en cache
 */
export async function saveCachedScraping(data) {
  try {
    const pool = getDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutos

    const jsonData = JSON.stringify(data);

    // Limpiar cache antiguo
    await pool.execute('DELETE FROM scraping_cache WHERE expires_at < ?', [now.toISOString()]);

    // Insertar nuevo cache
    await pool.execute(`
      INSERT INTO scraping_cache (data, expires_at)
      VALUES (?, ?)
    `, [jsonData, expiresAt.toISOString()]);

    console.log('✅ Scraping guardado en cache');
  } catch (error) {
    console.error('Error guardando scraping en cache:', error);
    throw error;
  }
}
