import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getMobilityBySector } from '@/lib/services/mobilityService';
import { getDatabase, ensureDatabaseInitialized } from '@/lib/db/db';
import { logActivity } from '@/lib/db/activities';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function saveSearch({ userId, sector, url, coordinates, count }) {
  const pool = getDatabase();
  const [result] = await pool.execute(
    `INSERT INTO searches (user_id, sector, url, latitude, longitude, results_count)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      sector,
      url || null,
      coordinates?.lat || null,
      coordinates?.lng || null,
      count,
    ]
  );
  return result.insertId;
}

async function saveSearchResults(searchId, incidents) {
  if (!incidents || incidents.length === 0) return;
  const pool = getDatabase();
  for (const incident of incidents) {
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
        JSON.stringify(incident),
      ]
    );
  }
}

export async function POST(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { active: true });
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { sector, lat, lng, source, skipCache, stream = false, url } = body || {};

  if (!sector) {
    return NextResponse.json(
      { error: 'Sector requerido', message: 'Debes proporcionar un sector para buscar' },
      { status: 400 }
    );
  }

  // ─────── Streaming (SSE) ───────
  if (stream) {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };

        send({ type: 'start', message: 'Iniciando búsqueda...' });

        const allIncidents = [];
        let finalCoordinates = null;
        let finalDebugInfo = {};

        const onIncidentFound = (incident) => {
          allIncidents.push(incident);
          send({ type: 'incident', incident });
        };
        const onProgress = (progress) => {
          send({ type: 'progress', ...progress });
        };

        try {
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

          send({
            type: 'complete',
            results: {
              incidents: allIncidents,
              coordinates: finalCoordinates,
              isMock: results.isMock || false,
              sourceStats: results.sourceStats || null,
              debug: finalDebugInfo,
            },
          });

          const searchId = await saveSearch({
            userId,
            sector,
            url,
            coordinates: finalCoordinates,
            count: allIncidents.length,
          });
          await saveSearchResults(searchId, allIncidents);
        } catch (error) {
          console.error('Error en búsqueda con streaming:', error);
          send({ type: 'error', error: error.message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  // ─────── No streaming ───────
  try {
    const results = await getMobilityBySector(sector, lat, lng, source, skipCache);

    const searchId = await saveSearch({
      userId,
      sector,
      url,
      coordinates: results.coordinates,
      count: results.incidents?.length || 0,
    });

    try {
      await logActivity(userId, 'search', {
        sector,
        latitude: results.coordinates?.lat || null,
        longitude: results.coordinates?.lng || null,
        results_count: results.incidents?.length || 0,
        search_id: searchId,
        isMock: results.isMock || false,
      });
    } catch (error) {
      console.error('Error registrando actividad de búsqueda:', error);
    }

    await saveSearchResults(searchId, results.incidents || []);

    return NextResponse.json({
      success: true,
      search: { id: searchId, sector, date: new Date().toISOString() },
      results: {
        incidents: results.incidents,
        coordinates: results.coordinates,
        source: results.source,
        searchSource: source || 'all',
        isMock: results.isMock || false,
        sourceStats: results.sourceStats || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al realizar búsqueda', message: error.message },
      { status: 500 }
    );
  }
}
