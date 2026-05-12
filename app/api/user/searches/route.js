import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getDatabase, ensureDatabaseInitialized } from '@/lib/db/db';

export const runtime = 'nodejs';

export async function GET(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { active: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const pool = getDatabase();
    const [searches] = await pool.execute(
      `SELECT id, sector, url, latitude, longitude, search_date, results_count
       FROM searches WHERE user_id = ?
       ORDER BY search_date DESC LIMIT ? OFFSET ?`,
      [auth.user.id, limit, offset]
    );

    const withCreatedAt = searches.map((s) => ({ ...s, created_at: s.search_date }));

    return NextResponse.json({
      success: true,
      searches: withCreatedAt,
      total: withCreatedAt.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener historial', message: error.message },
      { status: 500 }
    );
  }
}
