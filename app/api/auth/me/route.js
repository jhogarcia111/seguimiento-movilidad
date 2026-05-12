import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getUserById } from '@/lib/services/authService';
import { ensureDatabaseInitialized } from '@/lib/db/db';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    await ensureDatabaseInitialized();
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const user = await getUserById(auth.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener información del usuario', message: error.message },
      { status: 500 }
    );
  }
}
