import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { ensureDatabaseInitialized } from '@/lib/db/db';
import { getActivityStats } from '@/lib/db/activities';

export const runtime = 'nodejs';

export async function GET(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      userId: searchParams.get('user_id') ? parseInt(searchParams.get('user_id'), 10) : null,
      startDate: searchParams.get('start_date') || null,
      endDate: searchParams.get('end_date') || null,
    };
    const stats = await getActivityStats(filters);
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener estadísticas', message: error.message },
      { status: 500 }
    );
  }
}
