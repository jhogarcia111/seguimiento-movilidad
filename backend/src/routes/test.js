import express from 'express';
import { authenticate, requireActiveUser } from '../middleware/auth.js';
import { extractNewsFromHTML } from '../services/scrapingService.js';
import axios from 'axios';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);
router.use(requireActiveUser);

/**
 * POST /api/test/scrape
 * Hace scraping de una URL específica para pruebas
 */
router.post('/scrape', async (req, res) => {
  try {
    const { url, userQuery = null } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL requerida',
        message: 'Debes proporcionar una URL para hacer scraping'
      });
    }

    console.log(`🧪 [TEST] Iniciando scraping de prueba para URL: ${url}`);
    console.log(`🧪 [TEST] Búsqueda del usuario: ${userQuery || 'N/A'}`);

    // Hacer scraping de la URL
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      }
    });

    if (response.status !== 200) {
      return res.status(response.status).json({
        error: 'Error al obtener la URL',
        message: `La URL devolvió un código de estado ${response.status}`,
        incidents: [],
        debug: {
          url: url,
          status: response.status,
          contentType: response.headers['content-type']
        }
      });
    }

    console.log(`🧪 [TEST] URL obtenida exitosamente (${response.status})`);
    console.log(`🧪 [TEST] Content-Type: ${response.headers['content-type']}`);
    console.log(`🧪 [TEST] Tamaño del contenido: ${response.data.length} caracteres`);

    // Extraer reportes del HTML
    // Si hay userQuery, usarlo para validar relevancia
    // Si no hay userQuery, extraer todos los reportes
    const needsContentReview = false; // Por defecto, no revisar contenido completo
    const news = await extractNewsFromHTML(response.data, url, userQuery, needsContentReview);

    console.log(`🧪 [TEST] Extraídos ${news.length} reportes de movilidad`);

    // Geocodificar ubicaciones de los incidentes
    const { geocodeSector } = await import('../services/geocodingService.js');
    const incidentsWithCoordinates = await Promise.all(
      news.map(async (incident) => {
        // Si ya tiene coordenadas, usarlas
        if (incident.coordinates && incident.coordinates.lat && incident.coordinates.lng) {
          return incident;
        }

        // Si tiene ubicaciones, geocodificar la primera
        if (incident.locations && incident.locations.length > 0) {
          const locationName = incident.locations[0];
          try {
            const coordinates = await geocodeSector(locationName);
            if (coordinates) {
              console.log(`🧪 [TEST] Geocodificada ubicación "${locationName}": ${coordinates.lat}, ${coordinates.lng}`);
              return {
                ...incident,
                coordinates: coordinates,
                location: {
                  name: locationName,
                  coordinates: coordinates
                }
              };
            }
          } catch (error) {
            console.warn(`🧪 [TEST] No se pudo geocodificar "${locationName}": ${error.message}`);
          }
        }

        return incident;
      })
    );

    // Preparar información de debug
    const debugInfo = {
      url: url,
      status: response.status,
      contentType: response.headers['content-type'],
      contentLength: response.data.length,
      incidentsFound: incidentsWithCoordinates.length,
      incidents: incidentsWithCoordinates.map(n => ({
        id: n.id,
        title: n.title,
        type: n.type,
        locations: n.locations,
        source: n.source,
        hasCoordinates: !!(n.coordinates && n.coordinates.lat && n.coordinates.lng)
      }))
    };

    return res.json({
      success: true,
      incidents: incidentsWithCoordinates,
      debug: debugInfo
    });

  } catch (error) {
    console.error(`🧪 [TEST] Error en scraping de prueba:`, error.message);
    
    return res.status(500).json({
      error: 'Error al hacer scraping',
      message: error.message,
      incidents: [],
      debug: {
        url: req.body.url || 'N/A',
        error: error.message,
        stack: error.stack
      }
    });
  }
});

export default router;

