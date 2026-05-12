import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { ensureDatabaseInitialized } from '@/lib/db/db';
import { getUnreadNotificationsCount } from '@/lib/db/notifications';

export const runtime = 'nodejs';

export async function GET(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const count = await getUnreadNotificationsCount();
    return NextResponse.json({ success: true, count });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener conteo de notificaciones', message: error.message },
      { status: 500 }
    );
  }
}
