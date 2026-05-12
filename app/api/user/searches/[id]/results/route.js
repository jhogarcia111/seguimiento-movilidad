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
  const auth = await requireAuth(request, { active: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const pool = getDatabase();

    const [searches] = await pool.execute(
      'SELECT id FROM searches WHERE id = ? AND user_id = ?',
      [id, auth.user.id]
    );
    if (searches.length === 0) {
      return NextResponse.json({ error: 'Búsqueda no encontrada' }, { status: 404 });
    }

    const [results] = await pool.execute(
      `SELECT incident_id, type, title, description, source, location,
              coordinates, url, timestamp, result_data
       FROM search_results WHERE search_id = ?
       ORDER BY timestamp DESC`,
      [id]
    );

    const parsedResults = results.map((r) => ({
      ...r,
      coordinates: asObj(r.coordinates),
      data: asObj(r.result_data),
    }));

    return NextResponse.json({ success: true, searchId: id, results: parsedResults });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener resultados', message: error.message },
      { status: 500 }
    );
  }
}
