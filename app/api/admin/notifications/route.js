import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { ensureDatabaseInitialized } from '@/lib/db/db';
import { getUnreadNotifications, getAllNotifications } from '@/lib/db/notifications';

export const runtime = 'nodejs';

export async function GET(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || (unreadOnly ? '50' : '100'), 10);

    const notifications = unreadOnly
      ? await getUnreadNotifications(limit)
      : await getAllNotifications(limit);

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener notificaciones', message: error.message },
      { status: 500 }
    );
  }
}
