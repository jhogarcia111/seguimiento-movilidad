import { getDatabase } from './db.js';

/**
 * Registra una actividad de usuario
 * @param {number} userId - ID del usuario
 * @param {string} activityType - Tipo de actividad: 'login', 'logout', 'search', 'app_open'
 * @param {Object} activityData - Datos adicionales de la actividad (opcional)
 * @returns {Promise<number>} ID de la actividad registrada
 */
export async function logActivity(userId, activityType, activityData = null) {
  try {
    const pool = getDatabase();
    
    const [result] = await pool.execute(
      `INSERT INTO user_activities (user_id, activity_type, activity_data)
       VALUES (?, ?, ?)`,
      [
        userId,
        activityType,
        activityData ? JSON.stringify(activityData) : null
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error('Error registrando actividad:', error);
    throw error;
  }
}

/**
 * Obtiene actividades de usuarios con filtros opcionales
 * @param {Object} filters - Filtros opcionales
 * @param {number} filters.userId - Filtrar por usuario
 * @param {string} filters.activityType - Filtrar por tipo de actividad
 * @param {Date} filters.startDate - Fecha de inicio
 * @param {Date} filters.endDate - Fecha de fin
 * @param {number} filters.limit - Límite de resultados
 * @param {number} filters.offset - Offset para paginación
 * @returns {Promise<Array>} Array de actividades
 */
export async function getActivities(filters = {}) {
  try {
    const pool = getDatabase();
    
    let query = `
      SELECT 
        ua.id,
        ua.user_id,
        u.username,
        u.email,
        ua.activity_type,
        ua.activity_data,
        ua.created_at
      FROM user_activities ua
      JOIN users u ON ua.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.userId) {
      query += ' AND ua.user_id = ?';
      params.push(filters.userId);
    }
    
    if (filters.activityType) {
      query += ' AND ua.activity_type = ?';
      params.push(filters.activityType);
    }
    
    if (filters.startDate) {
      query += ' AND ua.created_at >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ' AND ua.created_at <= ?';
      params.push(filters.endDate);
    }
    
    query += ' ORDER BY ua.created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }
    
    const [rows] = await pool.execute(query, params);
    
    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      username: row.username,
      email: row.email,
      activity_type: row.activity_type,
      activity_data:
        row.activity_data == null
          ? null
          : typeof row.activity_data === 'string'
            ? JSON.parse(row.activity_data)
            : row.activity_data,
      created_at: row.created_at
    }));
  } catch (error) {
    console.error('Error obteniendo actividades:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de actividades agrupadas
 * @param {Object} filters - Filtros opcionales (mismo formato que getActivities)
 * @returns {Promise<Object>} Estadísticas de actividades
 */
export async function getActivityStats(filters = {}) {
  try {
    const pool = getDatabase();
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (filters.userId) {
      whereClause += ' AND ua.user_id = ?';
      params.push(filters.userId);
    }
    
    if (filters.startDate) {
      whereClause += ' AND ua.created_at >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      whereClause += ' AND ua.created_at <= ?';
      params.push(filters.endDate);
    }
    
    // Estadísticas por tipo de actividad
    const [activityTypeStats] = await pool.execute(`
      SELECT 
        activity_type,
        COUNT(*) as count
      FROM user_activities ua
      ${whereClause}
      GROUP BY activity_type
      ORDER BY count DESC
    `, params);
    
    // Estadísticas por día
    const [dailyStats] = await pool.execute(`
      SELECT 
        DATE(ua.created_at) as date,
        activity_type,
        COUNT(*) as count
      FROM user_activities ua
      ${whereClause}
      GROUP BY DATE(ua.created_at), activity_type
      ORDER BY date DESC, activity_type
    `, params);
    
    // Estadísticas por usuario
    const [userStats] = await pool.execute(`
      SELECT 
        ua.user_id,
        u.username,
        u.email,
        ua.activity_type,
        COUNT(*) as count
      FROM user_activities ua
      JOIN users u ON ua.user_id = u.id
      ${whereClause}
      GROUP BY ua.user_id, ua.activity_type
      ORDER BY count DESC
    `, params);
    
    // Total de actividades
    const [totalStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM user_activities ua
      ${whereClause}
    `, params);
    
    return {
      by_type: activityTypeStats,
      by_day: dailyStats,
      by_user: userStats,
      totals: totalStats[0] || { total_activities: 0, unique_users: 0, active_days: 0 }
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de actividades:', error);
    throw error;
  }
}

