import { NextResponse } from 'next/server';
import axios from 'axios';
import { requireAuth } from '@/lib/middleware/auth';
import { ensureDatabaseInitialized } from '@/lib/db/db';
import { extractNewsFromHTML } from '@/lib/services/scrapingService';
import { geocodeSector } from '@/lib/services/geocodingService';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { active: true });
  if (auth instanceof NextResponse) return auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { url, userQuery = null } = body || {};
  if (!url) {
    return NextResponse.json(
      {
        error: 'URL requerida',
        message: 'Debes proporcionar una URL para hacer scraping',
      },
      { status: 400 }
    );
  }

  try {
    console.log(`🧪 [TEST] Iniciando scraping de prueba para URL: ${url}`);
    console.log(`🧪 [TEST] Búsqueda del usuario: ${userQuery || 'N/A'}`);

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (response.status !== 200) {
      return NextResponse.json(
        {
          error: 'Error al obtener la URL',
          message: `La URL devolvió un código de estado ${response.status}`,
          incidents: [],
          debug: {
            url,
            status: response.status,
            contentType: response.headers['content-type'],
          },
        },
        { status: response.status }
      );
    }

    console.log(`🧪 [TEST] URL obtenida exitosamente (${response.status})`);
    const news = await extractNewsFromHTML(response.data, url, userQuery, false);
    console.log(`🧪 [TEST] Extraídos ${news.length} reportes de movilidad`);

    const incidentsWithCoordinates = await Promise.all(
      news.map(async (incident) => {
        if (incident.coordinates && incident.coordinates.lat && incident.coordinates.lng) {
          return incident;
        }
        if (incident.locations && incident.locations.length > 0) {
          const locationName = incident.locations[0];
          try {
            const coordinates = await geocodeSector(locationName);
            if (coordinates) {
              console.log(
                `🧪 [TEST] Geocodificada ubicación "${locationName}": ${coordinates.lat}, ${coordinates.lng}`
              );
              return {
                ...incident,
                coordinates,
                location: { name: locationName, coordinates },
              };
            }
          } catch (error) {
            console.warn(
              `🧪 [TEST] No se pudo geocodificar "${locationName}": ${error.message}`
            );
          }
        }
        return incident;
      })
    );

    const debugInfo = {
      url,
      status: response.status,
      contentType: response.headers['content-type'],
      contentLength: response.data.length,
      incidentsFound: incidentsWithCoordinates.length,
      incidents: incidentsWithCoordinates.map((n) => ({
        id: n.id,
        title: n.title,
        type: n.type,
        locations: n.locations,
        source: n.source,
        hasCoordinates: !!(n.coordinates && n.coordinates.lat && n.coordinates.lng),
      })),
    };

    return NextResponse.json({
      success: true,
      incidents: incidentsWithCoordinates,
      debug: debugInfo,
    });
  } catch (error) {
    console.error(`🧪 [TEST] Error en scraping de prueba:`, error.message);
    return NextResponse.json(
      {
        error: 'Error al hacer scraping',
        message: error.message,
        incidents: [],
        debug: { url: url || 'N/A', error: error.message, stack: error.stack },
      },
      { status: 500 }
    );
  }
}
