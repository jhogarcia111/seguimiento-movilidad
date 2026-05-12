import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { ensureDatabaseInitialized } from '@/lib/db/db';
import { markNotificationAsRead } from '@/lib/db/notifications';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await markNotificationAsRead(parseInt(id, 10));
    return NextResponse.json({ success: true, message: 'Notificación marcada como leída' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al marcar notificación como leída', message: error.message },
      { status: 500 }
    );
  }
}
