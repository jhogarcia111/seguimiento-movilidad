import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getDatabase } from '../database/db.js';
import { getConfig, setConfig, getAllConfig } from '../services/configService.js';

const router = express.Router();

// Todas las rutas de admin requieren autenticación y rol admin
router.use(authenticate);
router.use(requireAdmin);

/**
 * ========== GESTIÓN DE FUENTES ==========
 */

/**
 * GET /api/admin/sources
 * Obtiene todas las fuentes con sus tags
 */
router.get('/sources', async (req, res) => {
  try {
    const pool = getDatabase();
    
    const [sources] = await pool.execute(`
      SELECT s.*, 
             string_agg(
               concat(t.id::text, ':', t.name, ':', t.color),
               ','
               ORDER BY t.name
             ) as tags
      FROM sources s
      LEFT JOIN source_tags st ON s.id = st.source_id
      LEFT JOIN tags t ON st.tag_id = t.id
      GROUP BY s.id
      ORDER BY s.name
    `);

    // Procesar tags
    const sourcesWithTags = sources.map(source => ({
      ...source,
      tags: source.tags 
        ? source.tags.split(',').map(tagStr => {
            const [id, name, color] = tagStr.split(':');
            return { id: parseInt(id), name, color };
          })
        : []
    }));

    res.json({
      success: true,
      sources: sourcesWithTags
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener fuentes',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/sources
 * Crea una nueva fuente
 */
router.post('/sources', async (req, res) => {
  try {
    const pool = getDatabase();
    const { name, type, identifier, description, city, tagIds = [] } = req.body;

    if (!name || !type || !identifier) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'name, type e identifier son requeridos'
      });
    }
    
    // Insertar fuente
    const [result] = await pool.execute(
      `INSERT INTO sources (name, type, identifier, description, city, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, type, identifier, description || null, city || null, true]
    );

    const sourceId = result.insertId;

    // Asignar tags
    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        await pool.execute(
          'INSERT INTO source_tags (source_id, tag_id) VALUES (?, ?) ON CONFLICT (source_id, tag_id) DO NOTHING',
          [sourceId, tagId]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Fuente creada exitosamente',
      source: { id: sourceId, name, type, identifier }
    });
  } catch (error) {
    res.status(400).json({
      error: 'Error al crear fuente',
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/sources/:id
 * Actualiza una fuente
 */
router.put('/sources/:id', async (req, res) => {
  try {
    const pool = getDatabase();
    const { id } = req.params;
    const { name, type, identifier, description, city, is_active, tagIds } = req.body;

    // Actualizar fuente
    await pool.execute(
      `UPDATE sources 
       SET name = ?, type = ?, identifier = ?, description = ?, city = ?, is_active = ?
       WHERE id = ?`,
      [
        name || null,
        type || null,
        identifier || null,
        description || null,
        city || null,
        is_active !== undefined ? is_active : true,
        id
      ]
    );

    // Actualizar tags si se proporcionan
    if (tagIds !== undefined) {
      // Eliminar tags actuales
      await pool.execute('DELETE FROM source_tags WHERE source_id = ?', [id]);
      
      // Insertar nuevos tags
      if (tagIds.length > 0) {
        for (const tagId of tagIds) {
          await pool.execute(
            'INSERT INTO source_tags (source_id, tag_id) VALUES (?, ?)',
            [id, tagId]
          );
        }
      }
    }

    res.json({
      success: true,
      message: 'Fuente actualizada exitosamente'
    });
  } catch (error) {
    res.status(400).json({
      error: 'Error al actualizar fuente',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/sources/:id
 * Elimina una fuente (soft delete: marca como inactiva)
 */
router.delete('/sources/:id', async (req, res) => {
  try {
    const pool = getDatabase();
    const { id } = req.params;

    await pool.execute(
      'UPDATE sources SET is_active = FALSE WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Fuente desactivada exitosamente'
    });
  } catch (error) {
    res.status(400).json({
      error: 'Error al desactivar fuente',
      message: error.message
    });
  }
});

/**
 * ========== GESTIÓN DE TAGS ==========
 */

/**
 * GET /api/admin/tags
 * Obtiene todos los tags
 */
router.get('/tags', async (req, res) => {
  try {
    const pool = getDatabase();
    const [tags] = await pool.execute('SELECT * FROM tags ORDER BY name');

    res.json({
      success: true,
      tags
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener tags',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/tags
 * Crea un nuevo tag
 */
router.post('/tags', async (req, res) => {
  try {
    const pool = getDatabase();
    const { name, description, color = '#1a73e8' } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Nombre requerido',
        message: 'El nombre del tag es requerido'
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO tags (name, description, color) VALUES (?, ?, ?)',
      [name, description || null, color]
    );

    res.status(201).json({
      success: true,
      message: 'Tag creado exitosamente',
      tag: { id: result.insertId, name, description, color }
    });
  } catch (error) {
    res.status(400).json({
      error: 'Error al crear tag',
      message: error.message
    });
  }
});

/**
 * ========== GESTIÓN DE USUARIOS ==========
 */

/**
 * GET /api/admin/users
 * Obtiene todos los usuarios con conteo de actividades
 */
router.get('/users', async (req, res) => {
  try {
    const pool = getDatabase();
    const [users] = await pool.execute(
      `SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.role, 
        u.is_active, 
        u.approval_status, 
        u.created_at, 
        u.updated_at,
        COALESCE(COUNT(ua.id), 0) as activity_count
       FROM users u
       LEFT JOIN user_activities ua ON u.id = ua.user_id
       GROUP BY u.id, u.username, u.email, u.role, u.is_active, u.approval_status, u.created_at, u.updated_at
       ORDER BY u.created_at DESC`
    );

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener usuarios',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/users
 * Crea un nuevo usuario (admin puede crear admins)
 */
router.post('/users', async (req, res) => {
  try {
    const { createUser } = await import('../services/authService.js');
    const user = await createUser(req.body);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user
    });
  } catch (error) {
    res.status(400).json({
      error: 'Error al crear usuario',
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/users/:id
 * Actualiza un usuario
 */
router.put('/users/:id', async (req, res) => {
  try {
    const pool = getDatabase();
    const { id } = req.params;
    const { username, email, role, is_active, password } = req.body;

    const updates = [];
    const values = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role) {
      updates.push('role = ?');
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    if (password) {
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No hay campos para actualizar'
      });
    }

    values.push(id);
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error) {
    res.status(400).json({
      error: 'Error al actualizar usuario',
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/users/:id/approve
 * Cambia el approval_status de un usuario (active, pending, inactive)
 */
router.put('/users/:id/approve', async (req, res) => {
  try {
    const pool = getDatabase();
    const { id } = req.params;
    const { approval_status } = req.body;

    if (!approval_status || !['active', 'pending', 'inactive'].includes(approval_status)) {
      return res.status(400).json({
        error: 'Estado de aprobación inválido',
        message: 'approval_status debe ser: active, pending o inactive'
      });
    }

    // No permitir desactivar a sí mismo
    if (parseInt(id) === req.user.id && approval_status === 'inactive') {
      return res.status(400).json({
        error: 'No puedes desactivar tu propia cuenta'
      });
    }

    // Actualizar approval_status y is_active según corresponda
    const isActive = approval_status === 'active';
    
    await pool.execute(
      'UPDATE users SET approval_status = ?, is_active = ? WHERE id = ?',
      [approval_status, isActive, id]
    );

    // Si se activó la cuenta, enviar email de activación
    if (approval_status === 'active') {
      try {
        const [users] = await pool.execute(
          'SELECT username, email FROM users WHERE id = ?',
          [id]
        );
        if (users.length > 0) {
          const { sendActivationEmail } = await import('../services/emailService.js');
          console.log(`📧 Intentando enviar email de activación a: ${users[0].email}`);
          const result = await sendActivationEmail(users[0].username, users[0].email);
          if (result.success) {
            console.log(`✅ Email de activación enviado exitosamente a: ${users[0].email}`);
          } else {
            console.error(`❌ Error enviando email de activación: ${result.error || 'Error desconocido'}`);
          }
        } else {
          console.warn(`⚠️ No se encontró el usuario con ID ${id} para enviar email de activación`);
        }
      } catch (error) {
        // No fallar la activación si falla el email
        console.error('❌ Error enviando email de activación:', error);
        console.error('Stack trace:', error.stack);
      }
    }

    res.json({
      success: true,
      message: `Usuario ${approval_status === 'active' ? 'activado' : approval_status === 'pending' ? 'marcado como pendiente' : 'desactivado'} exitosamente`
    });
  } catch (error) {
    res.status(400).json({
      error: 'Error al actualizar estado de aprobación',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Desactiva un usuario (no elimina, solo marca como inactivo)
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const pool = getDatabase();
    const { id } = req.params;

    // No permitir desactivar a sí mismo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        error: 'No puedes desactivar tu propia cuenta'
      });
    }

    await pool.execute(
      'UPDATE users SET is_active = FALSE, approval_status = ? WHERE id = ?',
      ['inactive', id]
    );

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    res.status(400).json({
      error: 'Error al desactivar usuario',
      message: error.message
    });
  }
});

/**
 * ========== ANALYTICS Y ACTIVIDADES ==========
 */

/**
 * GET /api/admin/activities
 * Obtiene actividades de usuarios con filtros opcionales
 */
router.get('/activities', async (req, res) => {
  try {
    const { getActivities } = await import('../database/activities.js');
    
    const filters = {
      userId: req.query.user_id ? parseInt(req.query.user_id) : null,
      activityType: req.query.activity_type || null,
      startDate: req.query.start_date || null,
      endDate: req.query.end_date || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };
    
    const activities = await getActivities(filters);
    
    res.json({
      success: true,
      activities,
      total: activities.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener actividades',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/analytics/stats
 * Obtiene estadísticas de actividades
 */
router.get('/analytics/stats', async (req, res) => {
  try {
    const { getActivityStats } = await import('../database/activities.js');
    
    const filters = {
      userId: req.query.user_id ? parseInt(req.query.user_id) : null,
      startDate: req.query.start_date || null,
      endDate: req.query.end_date || null
    };
    
    const stats = await getActivityStats(filters);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/searches/:id/results
 * Obtiene los resultados de una búsqueda específica (para administradores)
 */
router.get('/searches/:id/results', async (req, res) => {
  try {
    const { getDatabase } = await import('../database/db.js');
    const pool = getDatabase();
    const { id } = req.params;

    // Verificar que la búsqueda existe
    const [searches] = await pool.execute(
      'SELECT id, sector, latitude, longitude, search_date, results_count FROM searches WHERE id = ?',
      [id]
    );

    if (searches.length === 0) {
      return res.status(404).json({
        error: 'Búsqueda no encontrada'
      });
    }

    const search = searches[0];

    // Obtener resultados guardados
    const [results] = await pool.execute(
      `SELECT incident_id, type, title, description, source, location, 
              coordinates, url, timestamp, result_data
       FROM search_results
       WHERE search_id = ?
       ORDER BY timestamp DESC`,
      [id]
    );

    // Parsear JSON y reconstruir los incidentes
    const asObj = (v) => {
      if (v == null) return null;
      return typeof v === 'object' ? v : JSON.parse(v);
    };

    const incidents = results.map(result => {
      const incidentData = asObj(result.result_data) || {};
      return {
        id: result.incident_id || incidentData.id,
        type: result.type || incidentData.type,
        title: result.title || incidentData.title,
        description: result.description || incidentData.description,
        source: result.source || incidentData.source,
        location: result.location ? { name: result.location } : (incidentData.location || null),
        coordinates: asObj(result.coordinates) ?? incidentData.coordinates ?? null,
        url: result.url || incidentData.url,
        timestamp: result.timestamp || incidentData.timestamp
      };
    });

    // Detectar si los datos son mock: si todos los incident_ids empiezan con 'mock-'
    const isMock = incidents.length > 0 && incidents.every(incident => 
      incident.id && incident.id.toString().startsWith('mock-')
    );

    res.json({
      success: true,
      search: {
        id: search.id,
        sector: search.sector,
        latitude: search.latitude,
        longitude: search.longitude,
        search_date: search.search_date,
        results_count: search.results_count
      },
      results: {
        incidents: incidents,
        coordinates: search.latitude && search.longitude ? {
          lat: parseFloat(search.latitude),
          lng: parseFloat(search.longitude)
        } : null,
        isMock: isMock || false
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener resultados',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/api-status
 * Obtiene el estado del uso del API de Twitter
 */
router.get('/api-status', async (req, res) => {
  try {
    const { getApiStatus } = await import('../services/twitterService.js');
    const status = await getApiStatus();
    
    res.json({
      success: true,
      apiStatus: status
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener estado del API',
      message: error.message
    });
  }
});

/**
 * ========== NOTIFICACIONES ==========
 */

/**
 * GET /api/admin/notifications
 * Obtiene todas las notificaciones (o solo no leídas)
 */
router.get('/notifications', async (req, res) => {
  try {
    const { getUnreadNotifications, getAllNotifications } = await import('../database/notifications.js');
    const unreadOnly = req.query.unread_only === 'true';
    
    const notifications = unreadOnly 
      ? await getUnreadNotifications(parseInt(req.query.limit) || 50)
      : await getAllNotifications(parseInt(req.query.limit) || 100);
    
    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener notificaciones',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/notifications/count
 * Obtiene el conteo de notificaciones no leídas
 */
router.get('/notifications/count', async (req, res) => {
  try {
    const { getUnreadNotificationsCount } = await import('../database/notifications.js');
    const count = await getUnreadNotificationsCount();
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener conteo de notificaciones',
      message: error.message
    });
  }
});

/**
 * PATCH /api/admin/notifications/:id/read
 * Marca una notificación como leída
 */
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const { markNotificationAsRead } = await import('../database/notifications.js');
    const notificationId = parseInt(req.params.id);
    
    await markNotificationAsRead(notificationId);
    
    res.json({
      success: true,
      message: 'Notificación marcada como leída'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al marcar notificación como leída',
      message: error.message
    });
  }
});

/**
 * PATCH /api/admin/notifications/read-all
 * Marca todas las notificaciones como leídas
 */
router.patch('/notifications/read-all', async (req, res) => {
  try {
    const { markAllNotificationsAsRead } = await import('../database/notifications.js');
    
    await markAllNotificationsAsRead();
    
    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al marcar todas las notificaciones como leídas',
      message: error.message
    });
  }
});

/**
 * ========== CONFIGURACIÓN DEL SISTEMA ==========
 */

/**
 * GET /api/admin/config
 * Obtiene todas las configuraciones del sistema
 */
router.get('/config', async (req, res) => {
  try {
    const config = await getAllConfig();
    
    res.json({
      success: true,
      config: config
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener configuración',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/config/:key
 * Obtiene una configuración específica
 */
router.get('/config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await getConfig(key);
    
    res.json({
      success: true,
      key: key,
      value: value
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener configuración',
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/config/:key
 * Actualiza una configuración específica
 */
router.put('/config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const userId = req.user.id;
    
    if (value === undefined) {
      return res.status(400).json({
        error: 'El campo "value" es requerido'
      });
    }
    
    const success = await setConfig(key, value, description, userId);
    
    if (success) {
      res.json({
        success: true,
        message: `Configuración ${key} actualizada correctamente`,
        key: key,
        value: value
      });
    } else {
      res.status(500).json({
        error: 'Error al actualizar configuración'
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Error al actualizar configuración',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/logs
 * Obtiene los logs del backend desde el buffer en memoria (tiempo real)
 */
router.get('/logs', async (req, res) => {
  try {
    const { getLogs, getLogsSince } = await import('../utils/logCapture.js');
    
    // Obtener parámetros de query
    const limit = req.query.limit ? parseInt(req.query.limit) : 500;
    const since = req.query.since ? new Date(req.query.since) : null;
    
    // Obtener logs del buffer en memoria
    const logs = since ? getLogsSince(since) : getLogs(limit);
    
    // Formatear logs para el frontend
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      content: log.content,
      level: log.level
    }));
    
    res.json({
      success: true,
      logs: formattedLogs,
      total: logs.length,
      showing: formattedLogs.length,
      source: 'memory' // Indicar que viene de memoria, no del archivo
    });
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener logs',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/logs
 * Sobrescribe el archivo de logs con el contenido proporcionado
 */
router.post('/logs', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Contenido inválido',
        message: 'Se requiere un campo "content" con el texto del log'
      });
    }

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Ruta al archivo de logs (relativa al backend)
    // Intentar múltiples ubicaciones posibles
    const possiblePaths = [
      path.join(__dirname, '../../consola_backend.log'), // Desde backend/src/routes
      path.join(__dirname, '../../../consola_backend.log'), // Desde raíz del proyecto
      path.join(process.cwd(), 'consola_backend.log'), // Desde directorio de trabajo actual
    ];
    
    let logFilePath = null;
    for (const possiblePath of possiblePaths) {
      try {
        // Verificar si el directorio existe o intentar crear el archivo
        const dir = path.dirname(possiblePath);
        if (fs.default.existsSync(dir)) {
          logFilePath = possiblePath;
          break;
        }
      } catch (e) {
        // Continuar con siguiente ruta
      }
    }
    
    // Si no se encontró, usar la primera ruta por defecto
    if (!logFilePath) {
      logFilePath = possiblePaths[0];
    }
    
    // Escribir el contenido al archivo (sobrescribir)
    fs.default.writeFileSync(logFilePath, content, 'utf-8');
    
    console.log(`✅ Archivo de log sobrescrito: ${logFilePath}`);
    
    res.json({
      success: true,
      message: 'Archivo de log actualizado exitosamente',
      filePath: logFilePath
    });
  } catch (error) {
    console.error('Error escribiendo logs:', error);
    res.status(500).json({
      success: false,
      error: 'Error al escribir logs',
      message: error.message
    });
  }
});

export default router;
