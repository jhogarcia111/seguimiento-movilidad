import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getDatabase, ensureDatabaseInitialized } from '@/lib/db/db';

export const runtime = 'nodejs';

function asObj(v) {
  if (v == null) return null;
  return typeof v === 'object' ? v : JSON.parse(v);
}

export async function GET(request, { params }) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const pool = getDatabase();

    const [searches] = await pool.execute(
      'SELECT id, sector, latitude, longitude, search_date, results_count FROM searches WHERE id = ?',
      [id]
    );
    if (searches.length === 0) {
      return NextResponse.json({ error: 'Búsqueda no encontrada' }, { status: 404 });
    }

    const search = searches[0];

    const [results] = await pool.execute(
      `SELECT incident_id, type, title, description, source, location,
              coordinates, url, timestamp, result_data
       FROM search_results
       WHERE search_id = ?
       ORDER BY timestamp DESC`,
      [id]
    );

    const incidents = results.map((result) => {
      const incidentData = asObj(result.result_data) || {};
      return {
        id: result.incident_id || incidentData.id,
        type: result.type || incidentData.type,
        title: result.title || incidentData.title,
        description: result.description || incidentData.description,
        source: result.source || incidentData.source,
        location: result.location ? { name: result.location } : incidentData.location || null,
        coordinates: asObj(result.coordinates) ?? incidentData.coordinates ?? null,
        url: result.url || incidentData.url,
        timestamp: result.timestamp || incidentData.timestamp,
      };
    });

    const isMock =
      incidents.length > 0 &&
      incidents.every((incident) => incident.id && incident.id.toString().startsWith('mock-'));

    return NextResponse.json({
      success: true,
      search: {
        id: search.id,
        sector: search.sector,
        latitude: search.latitude,
        longitude: search.longitude,
        search_date: search.search_date,
        results_count: search.results_count,
      },
      results: {
        incidents,
        coordinates:
          search.latitude && search.longitude
            ? { lat: parseFloat(search.latitude), lng: parseFloat(search.longitude) }
            : null,
        isMock: isMock || false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener resultados', message: error.message },
      { status: 500 }
    );
  }
}
