import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { ensureDatabaseInitialized } from '@/lib/db/db';
import { markAllNotificationsAsRead } from '@/lib/db/notifications';

export const runtime = 'nodejs';

export async function PATCH(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    await markAllNotificationsAsRead();
    return NextResponse.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Error al marcar todas las notificaciones como leídas',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
