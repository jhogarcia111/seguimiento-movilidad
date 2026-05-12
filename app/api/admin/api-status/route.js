import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { ensureDatabaseInitialized } from '@/lib/db/db';
import { getApiStatus } from '@/lib/services/twitterService';

export const runtime = 'nodejs';

export async function GET(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const status = await getApiStatus();
    return NextResponse.json({ success: true, apiStatus: status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener estado del API', message: error.message },
      { status: 500 }
    );
  }
}
