import express from 'express';
import { getMobilityBySector } from '../services/mobilityService.js';

const router = express.Router();

/**
 * GET /api/mobility/sector
 * Obtiene problemas de movilidad para un sector específico de Bogotá
 * Query params:
 * - sector: nombre del sector (ej: "Avenida Boyacá", "Calle 72")
 * - lat?: latitud opcional
 * - lng?: longitud opcional
 */
router.get('/sector', async (req, res) => {
  try {
    const { sector, lat, lng } = req.query;

    if (!sector) {
      return res.status(400).json({
        error: 'El parámetro "sector" es requerido',
        example: '/api/mobility/sector?sector=Avenida Boyacá'
      });
    }

    const results = await getMobilityBySector(sector, lat, lng);

    res.json({
      success: true,
      sector: sector,
      timestamp: new Date().toISOString(),
      results: results
    });
  } catch (error) {
    console.error('Error en /sector:', error);
    res.status(500).json({
      error: error.message || 'Error al consultar movilidad',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/mobility/all
 * Obtiene todos los problemas de movilidad recientes
 */
router.get('/all', async (req, res) => {
  try {
    const { hours = 4 } = req.query;
    // TODO: Implementar endpoint para obtener todos los incidentes
    res.json({
      success: true,
      message: 'Endpoint en desarrollo',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /all:', error);
    res.status(500).json({
      error: error.message || 'Error al consultar movilidad',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/mobility/refresh
 * Fuerza actualización de datos desde APIs externas
 */
router.get('/refresh', async (req, res) => {
  try {
    // TODO: Implementar refresh manual
    res.json({
      success: true,
      message: 'Refresh en desarrollo',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /refresh:', error);
    res.status(500).json({
      error: error.message || 'Error al refrescar datos',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
