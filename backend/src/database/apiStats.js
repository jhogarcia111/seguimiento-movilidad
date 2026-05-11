import { getDatabase } from './db.js';

/**
 * Obtiene las estadísticas actuales del API desde la base de datos
 * @returns {Promise<Object>} Estadísticas del API
 */
export async function getApiStats() {
  try {
    const pool = getDatabase();
    const [rows] = await pool.execute(
      'SELECT * FROM api_usage_stats WHERE id = 1'
    );
    
    if (rows.length === 0) {
      // Si no existe, crear registro inicial
      await pool.execute(`
        INSERT INTO api_usage_stats (id, total_requests, successful_requests, failed_requests)
        VALUES (1, 0, 0, 0)
      `);
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastRequestTime: null,
        rateLimitRemaining: null,
        rateLimitReset: null,
        rateLimitLimit: null,
        apiExceeded: false,
        apiExceededUntil: null
      };
    }
    
    const stats = rows[0];
    return {
      totalRequests: stats.total_requests || 0,
      successfulRequests: stats.successful_requests || 0,
      failedRequests: stats.failed_requests || 0,
      lastRequestTime: stats.last_request_time ? new Date(stats.last_request_time).getTime() : null,
      rateLimitRemaining: stats.rate_limit_remaining,
      rateLimitReset: stats.rate_limit_reset ? new Date(stats.rate_limit_reset).getTime() : null,
      rateLimitLimit: stats.rate_limit_limit,
      apiExceeded: stats.api_exceeded || false,
      apiExceededUntil: stats.api_exceeded_until ? new Date(stats.api_exceeded_until).getTime() : null
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas del API:', error);
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastRequestTime: null,
      rateLimitRemaining: null,
      rateLimitReset: null,
      rateLimitLimit: null,
      apiExceeded: false,
      apiExceededUntil: null
    };
  }
}

/**
 * Actualiza las estadísticas del API en la base de datos
 * @param {Object} stats - Estadísticas a actualizar
 */
export async function updateApiStats(stats) {
  try {
    const pool = getDatabase();
    
    const updateFields = [];
    const updateValues = [];
    
    if (stats.totalRequests !== undefined) {
      updateFields.push('total_requests = ?');
      updateValues.push(stats.totalRequests);
    }
    
    if (stats.successfulRequests !== undefined) {
      updateFields.push('successful_requests = ?');
      updateValues.push(stats.successfulRequests);
    }
    
    if (stats.failedRequests !== undefined) {
      updateFields.push('failed_requests = ?');
      updateValues.push(stats.failedRequests);
    }
    
    if (stats.lastRequestTime !== undefined) {
      updateFields.push('last_request_time = ?');
      updateValues.push(stats.lastRequestTime ? new Date(stats.lastRequestTime) : null);
    }
    
    if (stats.rateLimitRemaining !== undefined) {
      updateFields.push('rate_limit_remaining = ?');
      updateValues.push(stats.rateLimitRemaining);
    }
    
    if (stats.rateLimitReset !== undefined) {
      updateFields.push('rate_limit_reset = ?');
      updateValues.push(stats.rateLimitReset ? new Date(stats.rateLimitReset) : null);
    }
    
    if (stats.rateLimitLimit !== undefined) {
      updateFields.push('rate_limit_limit = ?');
      updateValues.push(stats.rateLimitLimit);
    }
    
    if (stats.apiExceeded !== undefined) {
      updateFields.push('api_exceeded = ?');
      updateValues.push(stats.apiExceeded);
    }
    
    if (stats.apiExceededUntil !== undefined) {
      updateFields.push('api_exceeded_until = ?');
      updateValues.push(stats.apiExceededUntil ? new Date(stats.apiExceededUntil) : null);
    }
    
    if (updateFields.length > 0) {
      updateValues.push(1); // id = 1
      await pool.execute(
        `UPDATE api_usage_stats SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }
  } catch (error) {
    console.error('Error actualizando estadísticas del API:', error);
  }
}

/**
 * Incrementa el contador de requests totales
 * @param {boolean} isSuccess - Si el request fue exitoso
 */
export async function incrementApiRequest(isSuccess = true) {
  try {
    const pool = getDatabase();
    
    if (isSuccess) {
      await pool.execute(
        'UPDATE api_usage_stats SET total_requests = total_requests + 1, successful_requests = successful_requests + 1, last_request_time = NOW() WHERE id = 1'
      );
    } else {
      await pool.execute(
        'UPDATE api_usage_stats SET total_requests = total_requests + 1, failed_requests = failed_requests + 1, last_request_time = NOW() WHERE id = 1'
      );
    }
  } catch (error) {
    console.error('Error incrementando contador de requests:', error);
  }
}

