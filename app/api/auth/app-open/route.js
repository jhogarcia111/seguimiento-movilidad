import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { logActivity } from '@/lib/db/activities';
import { ensureDatabaseInitialized } from '@/lib/db/db';

export const runtime = 'nodejs';

export async function POST(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await logActivity(auth.user.id, 'app_open', { timestamp: new Date().toISOString() });
    return NextResponse.json({ success: true, message: 'App open registrado' });
  } catch (error) {
    console.error('Error registrando actividad de app_open:', error);
    return NextResponse.json({
      success: true,
      message: 'App open registrado (con error en actividad)',
    });
  }
}
