import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { ensureDatabaseInitialized } from '@/lib/db/db';
import { getConfig, setConfig } from '@/lib/services/configService';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const { key } = await params;
    const value = await getConfig(key);
    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener configuración', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const { key } = await params;
    const { value, description } = await request.json();

    if (value === undefined) {
      return NextResponse.json(
        { error: 'El campo "value" es requerido' },
        { status: 400 }
      );
    }

    const success = await setConfig(key, value, description, auth.user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Error al actualizar configuración' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Configuración ${key} actualizada correctamente`,
      key,
      value,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar configuración', message: error.message },
      { status: 500 }
    );
  }
}
