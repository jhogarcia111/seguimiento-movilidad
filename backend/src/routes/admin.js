import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getDatabase } from '../database/db.js';

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
             GROUP_CONCAT(
               CONCAT(t.id, ':', t.name, ':', t.color) 
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
    const { name, type, identifier, description, tagIds = [] } = req.body;

    if (!name || !type || !identifier) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'name, type e identifier son requeridos'
      });
    }

    // Insertar fuente
    const [result] = await pool.execute(
      `INSERT INTO sources (name, type, identifier, description, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [name, type, identifier, description || null, true]
    );

    const sourceId = result.insertId;

    // Asignar tags
    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        await pool.execute(
          'INSERT IGNORE INTO source_tags (source_id, tag_id) VALUES (?, ?)',
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
    const { name, type, identifier, description, is_active, tagIds } = req.body;

    // Actualizar fuente
    await pool.execute(
      `UPDATE sources 
       SET name = ?, type = ?, identifier = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [
        name || null,
        type || null,
        identifier || null,
        description || null,
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
 * Obtiene todos los usuarios
 */
router.get('/users', async (req, res) => {
  try {
    const pool = getDatabase();
    const [users] = await pool.execute(
      `SELECT id, username, email, role, is_active, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
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
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [id]
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

export default router;
