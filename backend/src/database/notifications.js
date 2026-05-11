import { getDatabase } from './db.js';

/**
 * Crea una nueva notificación
 * @param {object} notificationData - Datos de la notificación
 * @param {string} notificationData.type - Tipo de notificación
 * @param {string} notificationData.title - Título
 * @param {string} notificationData.message - Mensaje
 * @param {string} notificationData.linkUrl - URL de redirección
 * @param {number} notificationData.userId - ID del usuario relacionado (opcional)
 */
export async function createNotification({ type, title, message, linkUrl, userId = null }) {
  try {
    const pool = getDatabase();
    const [result] = await pool.execute(
      `INSERT INTO notifications (notification_type, title, message, link_url, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [type, title, message, linkUrl, userId]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error creando notificación:', error);
    throw error;
  }
}

/**
 * Obtiene todas las notificaciones no leídas
 * @param {number} limit - Límite de resultados (opcional)
 * @returns {Promise<Array>} Lista de notificaciones
 */
export async function getUnreadNotifications(limit = 50) {
  try {
    const pool = getDatabase();
    const [rows] = await pool.execute(
      `SELECT 
        n.*,
        u.username,
        u.email
       FROM notifications n
       LEFT JOIN users u ON n.user_id = u.id
       WHERE n.is_read = FALSE
       ORDER BY n.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  } catch (error) {
    console.error('Error obteniendo notificaciones no leídas:', error);
    throw error;
  }
}

/**
 * Obtiene todas las notificaciones (leídas y no leídas)
 * @param {number} limit - Límite de resultados (opcional)
 * @returns {Promise<Array>} Lista de notificaciones
 */
export async function getAllNotifications(limit = 100) {
  try {
    const pool = getDatabase();
    const [rows] = await pool.execute(
      `SELECT 
        n.*,
        u.username,
        u.email
       FROM notifications n
       LEFT JOIN users u ON n.user_id = u.id
       ORDER BY n.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  } catch (error) {
    console.error('Error obteniendo todas las notificaciones:', error);
    throw error;
  }
}

/**
 * Marca una notificación como leída
 * @param {number} notificationId - ID de la notificación
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const pool = getDatabase();
    await pool.execute(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW()
       WHERE id = ?`,
      [notificationId]
    );
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    throw error;
  }
}

/**
 * Marca todas las notificaciones como leídas
 */
export async function markAllNotificationsAsRead() {
  try {
    const pool = getDatabase();
    await pool.execute(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW()
       WHERE is_read = FALSE`
    );
  } catch (error) {
    console.error('Error marcando todas las notificaciones como leídas:', error);
    throw error;
  }
}

/**
 * Obtiene el conteo de notificaciones no leídas
 * @returns {Promise<number>} Número de notificaciones no leídas
 */
export async function getUnreadNotificationsCount() {
  try {
    const pool = getDatabase();
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM notifications WHERE is_read = FALSE`
    );
    return Number(rows[0].count);
  } catch (error) {
    console.error('Error obteniendo conteo de notificaciones no leídas:', error);
    throw error;
  }
}

