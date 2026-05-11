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

/**
 * Obtiene incidentes de Waze cacheados
 * @param {Object} coordinates - Coordenadas { lat, lng }
 * @param {number} radius - Radio en metros
 * @returns {Promise<Object|null>} Cache de Waze o null
 */
export async function getCachedWazeIncidents(coordinates, radius) {
  try {
    const pool = getDatabase();
    const now = new Date().toISOString();

    const [rows] = await pool.execute(`
      SELECT incidents_data, created_at, expires_at
      FROM waze_cache
      WHERE expires_at > ?
        AND ABS(latitude - ?) < 0.01
        AND ABS(longitude - ?) < 0.01
        AND ABS(radius - ?) < 100
      ORDER BY created_at DESC
      LIMIT 1
    `, [now, coordinates.lat, coordinates.lng, radius]);

    if (rows && rows.length > 0 && rows[0].incidents_data) {
      try {
        return {
          incidents: JSON.parse(rows[0].incidents_data),
          timestamp: rows[0].created_at,
          expires_at: rows[0].expires_at
        };
      } catch (error) {
        console.error('Error parseando cache de Waze:', error);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Error obteniendo cache de Waze:', error);
    return null;
  }
}

/**
 * Guarda incidentes de Waze en cache
 * @param {Object} coordinates - Coordenadas { lat, lng }
 * @param {number} radius - Radio en metros
 * @param {Array} incidents - Array de incidentes
 */
export async function saveCachedWazeIncidents(coordinates, radius, incidents) {
  try {
    const pool = getDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutos

    const incidentsData = JSON.stringify(incidents);

    // Limpiar cache antiguo
    await pool.execute('DELETE FROM waze_cache WHERE expires_at < ?', [now.toISOString()]);

    // Insertar nuevo cache
    await pool.execute(`
      INSERT INTO waze_cache (latitude, longitude, radius, incidents_data, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [coordinates.lat, coordinates.lng, radius, incidentsData, expiresAt.toISOString()]);

    console.log(`✅ Incidentes de Waze guardados en cache (${incidents.length} incidentes)`);
  } catch (error) {
    console.error('Error guardando cache de Waze:', error);
    throw error;
  }
}

/**
 * Obtiene la cache general de problemas de movilidad
 * @returns {Promise<Object|null>} Objeto con incidents y last_updated, o null si no hay cache válida
 */
export async function getGeneralMobilityCache() {
  try {
    const pool = getDatabase();
    const now = new Date().toISOString();

    const [rows] = await pool.execute(`
      SELECT incidents_data, last_updated, expires_at
      FROM general_mobility_cache
      WHERE expires_at > ?
      ORDER BY last_updated DESC
      LIMIT 1
    `, [now]);

    if (rows && rows.length > 0 && rows[0].incidents_data) {
      try {
        const parsed = JSON.parse(rows[0].incidents_data);
        return {
          incidents: Array.isArray(parsed) ? parsed : [],
          last_updated: rows[0].last_updated,
          expires_at: rows[0].expires_at
        };
      } catch (error) {
        console.error('Error parseando general_mobility_cache:', error);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Error obteniendo cache general de movilidad:', error);
    return null;
  }
}

/**
 * Verifica si la cache general necesita actualización (han pasado más de 30 minutos)
 * @returns {Promise<boolean>} true si necesita actualización, false si no
 */
export async function shouldUpdateGeneralCache() {
  try {
    const cache = await getGeneralMobilityCache();
    if (!cache) {
      return true; // No hay cache, necesita actualización
    }

    const lastUpdated = new Date(cache.last_updated);
    const now = new Date();
    const minutesSinceUpdate = (now - lastUpdated) / (1000 * 60);

    // Si han pasado más de 60 minutos, necesita actualización (aumentado para reducir requests)
    return minutesSinceUpdate > 60;
  } catch (error) {
    console.error('Error verificando si necesita actualización:', error);
    return true; // En caso de error, actualizar
  }
}

/**
 * Guarda la cache general de problemas de movilidad
 * @param {Array} incidents - Array de incidentes
 */
export async function saveGeneralMobilityCache(incidents) {
  try {
    const pool = getDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (60 * 60 * 1000)); // 1 hora de expiración

    const incidentsData = JSON.stringify(incidents);

    // Limpiar cache antiguo
    await pool.execute('DELETE FROM general_mobility_cache WHERE expires_at < ?', [now.toISOString()]);

    // Insertar nuevo cache
    await pool.execute(`
      INSERT INTO general_mobility_cache (incidents_data, expires_at)
      VALUES (?, ?)
    `, [incidentsData, expiresAt.toISOString()]);

    console.log(`✅ Cache general de movilidad guardada (${incidents.length} incidentes)`);
  } catch (error) {
    console.error('Error guardando cache general de movilidad:', error);
    throw error;
  }
}

/**
 * Obtiene tweets cacheados de las últimas 24 horas (optimizado para API gratuito)
 * NOTA: Cache extendido a 24 horas para minimizar el uso del API gratuito (100 posts/mes)
 * @returns {Promise<Array>} Array de tweets
 */
export async function getCachedTweets() {
  try {
    const pool = getDatabase();
    const twentyFourHoursAgo = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 horas atrás

    // Limpiar tweets más antiguos de 7 días (mantener más tiempo para referencia)
    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    await pool.execute('DELETE FROM tweets_cache WHERE created_at < ?', [sevenDaysAgo.toISOString()]);

    // Obtener tweets de las últimas 24 horas
    const [rows] = await pool.execute(`
      SELECT tweet_id, text, author_id, created_at, public_metrics
      FROM tweets_cache
      WHERE created_at >= ?
      ORDER BY created_at DESC
      LIMIT 200
    `, [twentyFourHoursAgo.toISOString()]);

    const tweets = rows.map(row => ({
      id: row.tweet_id,
      text: row.text,
      author_id: row.author_id,
      created_at: new Date(row.created_at).toISOString(),
      public_metrics:
        row.public_metrics == null
          ? {}
          : typeof row.public_metrics === 'string'
            ? JSON.parse(row.public_metrics)
            : row.public_metrics
    }));

    console.log(`✅ Obtenidos ${tweets.length} tweets del cache (últimas 24 horas)`);
    return tweets;
  } catch (error) {
    console.error('Error obteniendo tweets cacheados:', error);
    return [];
  }
}

/**
 * Obtiene el ID del tweet más reciente en cache
 * @returns {Promise<string|null>} ID del tweet más reciente o null si no hay tweets
 */
export async function getLatestTweetId() {
  try {
    const pool = getDatabase();
    const [rows] = await pool.execute(`
      SELECT tweet_id
      FROM tweets_cache
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (rows && rows.length > 0 && rows[0].tweet_id) {
      return rows[0].tweet_id;
    }

    return null;
  } catch (error) {
    console.error('Error obteniendo ID del tweet más reciente:', error);
    return null;
  }
}

/**
 * Guarda tweets en cache (solo los que no existen)
 * @param {Array} tweets - Array de tweets a guardar
 */
export async function saveCachedTweets(tweets) {
  if (!tweets || tweets.length === 0) {
    return;
  }

  try {
    const pool = getDatabase();
    let savedCount = 0;
    let skippedCount = 0;

    for (const tweet of tweets) {
      try {
        // Verificar si el tweet ya existe
        const [existing] = await pool.execute(
          'SELECT tweet_id FROM tweets_cache WHERE tweet_id = ?',
          [tweet.id]
        );

        if (existing && existing.length > 0) {
          skippedCount++;
          continue;
        }

        // Insertar el tweet
        await pool.execute(`
          INSERT INTO tweets_cache (tweet_id, text, author_id, created_at, public_metrics)
          VALUES (?, ?, ?, ?, ?)
        `, [
          tweet.id,
          tweet.text,
          tweet.author_id,
          new Date(tweet.created_at).toISOString(),
          JSON.stringify(tweet.public_metrics || {})
        ]);
        
        savedCount++;
      } catch (error) {
        // Si es error de clave duplicada (por si acaso), ignorar
        if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
          skippedCount++;
        } else {
          console.error(`Error guardando tweet ${tweet.id}:`, error.message);
          skippedCount++;
        }
      }
    }

    console.log(`✅ Tweets guardados en cache: ${savedCount} nuevos, ${skippedCount} ya existían`);
  } catch (error) {
    console.error('Error guardando tweets en cache:', error);
    throw error;
  }
}