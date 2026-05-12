import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { ensureDatabaseInitialized } from '@/lib/db/db';
import { getActivities } from '@/lib/db/activities';

export const runtime = 'nodejs';

export async function GET(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      userId: searchParams.get('user_id') ? parseInt(searchParams.get('user_id'), 10) : null,
      activityType: searchParams.get('activity_type') || null,
      startDate: searchParams.get('start_date') || null,
      endDate: searchParams.get('end_date') || null,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit'), 10) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset'), 10) : 0,
    };

    const activities = await getActivities(filters);
    return NextResponse.json({ success: true, activities, total: activities.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener actividades', message: error.message },
      { status: 500 }
    );
  }
}
