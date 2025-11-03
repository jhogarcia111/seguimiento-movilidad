import express from 'express';
import { authenticate, requireActiveUser } from '../middleware/auth.js';
import { getMobilityBySector } from '../services/mobilityService.js';
import { getDatabase } from '../database/db.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);
router.use(requireActiveUser);

/**
 * POST /api/user/search
 * Realiza una búsqueda y guarda el historial
 */
router.post('/search', async (req, res) => {
  try {
    const { sector, lat, lng } = req.body;
    const userId = req.user.id;

    if (!sector) {
      return res.status(400).json({
        error: 'Sector requerido',
        message: 'Debes proporcionar un sector para buscar'
      });
    }

    // Realizar búsqueda
    const results = await getMobilityBySector(sector, lat, lng);

    const pool = getDatabase();

    // Guardar búsqueda en historial
    const [searchResult] = await pool.execute(
      `INSERT INTO searches (user_id, sector, latitude, longitude, results_count)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        sector,
        results.coordinates?.lat || null,
        results.coordinates?.lng || null,
        results.incidents?.length || 0
      ]
    );

    const searchId = searchResult.insertId;

    // Guardar resultados individuales (snapshot del momento)
    if (results.incidents && results.incidents.length > 0) {
      for (const incident of results.incidents) {
        await pool.execute(
          `INSERT INTO search_results 
           (search_id, incident_id, type, title, description, source, location, coordinates, url, timestamp, result_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            searchId,
            incident.id,
            incident.type || null,
            incident.title || null,
            incident.description || null,
            incident.source || null,
            incident.location?.name || null,
            JSON.stringify(incident.coordinates || null),
            incident.url || null,
            incident.timestamp || new Date().toISOString(),
            JSON.stringify(incident)
          ]
        );
      }
    }

    res.json({
      success: true,
      search: {
        id: searchId,
        sector,
        date: new Date().toISOString()
      },
      results: {
        incidents: results.incidents,
        coordinates: results.coordinates,
        source: results.source
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al realizar búsqueda',
      message: error.message
    });
  }
});

/**
 * GET /api/user/searches
 * Obtiene el historial de búsquedas del usuario
 */
router.get('/searches', async (req, res) => {
  try {
    const pool = getDatabase();
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const [searches] = await pool.execute(
      `SELECT id, sector, latitude, longitude, search_date, results_count
       FROM searches
       WHERE user_id = ?
       ORDER BY search_date DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      searches,
      total: searches.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener historial',
      message: error.message
    });
  }
});

/**
 * GET /api/user/searches/:id/results
 * Obtiene los resultados de una búsqueda específica (snapshot del momento)
 */
router.get('/searches/:id/results', async (req, res) => {
  try {
    const pool = getDatabase();
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que la búsqueda pertenece al usuario
    const [searches] = await pool.execute(
      'SELECT id FROM searches WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (searches.length === 0) {
      return res.status(404).json({
        error: 'Búsqueda no encontrada'
      });
    }

    // Obtener resultados guardados
    const [results] = await pool.execute(
      `SELECT incident_id, type, title, description, source, location, 
              coordinates, url, timestamp, result_data
       FROM search_results
       WHERE search_id = ?
       ORDER BY timestamp DESC`,
      [id]
    );

    // Parsear JSON
    const parsedResults = results.map(result => ({
      ...result,
      coordinates: result.coordinates ? JSON.parse(result.coordinates) : null,
      data: result.result_data ? JSON.parse(result.result_data) : null
    }));

    res.json({
      success: true,
      searchId: id,
      results: parsedResults
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener resultados',
      message: error.message
    });
  }
});

export default router;
