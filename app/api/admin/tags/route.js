import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getDatabase, ensureDatabaseInitialized } from '@/lib/db/db';

export const runtime = 'nodejs';

export async function GET(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const pool = getDatabase();
    const [tags] = await pool.execute('SELECT * FROM tags ORDER BY name');
    return NextResponse.json({ success: true, tags });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener tags', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const pool = getDatabase();
    const { name, description, color = '#1a73e8' } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Nombre requerido', message: 'El nombre del tag es requerido' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      'INSERT INTO tags (name, description, color) VALUES (?, ?, ?)',
      [name, description || null, color]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Tag creado exitosamente',
        tag: { id: result.insertId, name, description, color },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear tag', message: error.message },
      { status: 400 }
    );
  }
}
