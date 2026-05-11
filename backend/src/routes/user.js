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
 * Soporta Server-Sent Events (SSE) para resultados en tiempo real
 */
router.post('/search', async (req, res) => {
  try {
    const { sector, lat, lng, source, skipCache, stream = false } = req.body;
    const userId = req.user.id;

    if (!sector) {
      return res.status(400).json({
        error: 'Sector requerido',
        message: 'Debes proporcionar un sector para buscar'
      });
    }

    // Si se solicita streaming, usar Server-Sent Events (SSE)
    if (stream) {
      // Configurar headers para SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Deshabilitar buffering en nginx

      // Enviar evento inicial
      res.write(`data: ${JSON.stringify({ type: 'start', message: 'Iniciando búsqueda...' })}\n\n`);

      // Acumulador de resultados
      const allIncidents = [];
      let finalCoordinates = null;
      let finalDebugInfo = {};

      // Callback para enviar resultados en tiempo real
      const onIncidentFound = (incident) => {
        allIncidents.push(incident);
        res.write(`data: ${JSON.stringify({ type: 'incident', incident })}\n\n`);
      };

      const onProgress = (progress) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
      };

      try {
        // Realizar búsqueda con callbacks
        const results = await getMobilityBySector(
          sector, 
          lat, 
          lng, 
          source, 
          skipCache,
          onIncidentFound,
          onProgress
        );

        finalCoordinates = results.coordinates;
        finalDebugInfo = results.debug || {};

        // Enviar evento de finalización
        res.write(`data: ${JSON.stringify({ 
          type: 'complete', 
          results: {
            incidents: allIncidents,
            coordinates: finalCoordinates,
            isMock: results.isMock || false,
            debug: finalDebugInfo
          }
        })}\n\n`);

        // Guardar búsqueda en historial
        const pool = getDatabase();
        const { url } = req.body; // Obtener URL del body si está disponible
        const [searchResult] = await pool.execute(
          `INSERT INTO searches (user_id, sector, url, latitude, longitude, results_count)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            userId,
            sector,
            url || null,
            finalCoordinates?.lat || null,
            finalCoordinates?.lng || null,
            allIncidents.length
          ]
        );

        const searchId = searchResult.insertId;

        // Guardar resultados individuales
        if (allIncidents.length > 0) {
          for (const incident of allIncidents) {
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

        res.end();
      } catch (error) {
        console.error('Error en búsqueda con streaming:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      }
      return;
    }

    // Modo tradicional (sin streaming)
    // Realizar búsqueda (con fuente específica y opción de saltar caché si se proporciona)
    const results = await getMobilityBySector(sector, lat, lng, source, skipCache);

    const pool = getDatabase();

    // Guardar búsqueda en historial
    const { url } = req.body; // Obtener URL del body si está disponible
    const [searchResult] = await pool.execute(
      `INSERT INTO searches (user_id, sector, url, latitude, longitude, results_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        sector,
        url || null,
        results.coordinates?.lat || null,
        results.coordinates?.lng || null,
        results.incidents?.length || 0
      ]
    );

    const searchId = searchResult.insertId;

    // Registrar actividad de búsqueda
    try {
      const { logActivity } = await import('../database/activities.js');
      await logActivity(userId, 'search', {
        sector: sector,
        latitude: results.coordinates?.lat || null,
        longitude: results.coordinates?.lng || null,
        results_count: results.incidents?.length || 0,
        search_id: searchId,
        isMock: results.isMock || false
      });
    } catch (error) {
      // No fallar la búsqueda si falla el registro de actividad
      console.error('Error registrando actividad de búsqueda:', error);
    }

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
        source: results.source,
        searchSource: source || 'all', // Fuente específica usada para la búsqueda
        isMock: results.isMock || false
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
      `SELECT id, sector, url, latitude, longitude, search_date, results_count
       FROM searches
       WHERE user_id = ?
       ORDER BY search_date DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );
    
    // Mapear search_date a created_at para compatibilidad con el frontend
    const searchesWithCreatedAt = searches.map(search => ({
      ...search,
      created_at: search.search_date
    }));

    res.json({
      success: true,
      searches: searchesWithCreatedAt,
      total: searchesWithCreatedAt.length
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

    const asObj = (v) => {
      if (v == null) return null;
      return typeof v === 'object' ? v : JSON.parse(v);
    };

    const parsedResults = results.map(result => ({
      ...result,
      coordinates: asObj(result.coordinates),
      data: asObj(result.result_data)
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
