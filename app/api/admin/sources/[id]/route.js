import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getDatabase, ensureDatabaseInitialized } from '@/lib/db/db';

export const runtime = 'nodejs';

export async function PUT(request, { params }) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const pool = getDatabase();
    const { id } = await params;
    const { name, type, identifier, description, city, is_active, tagIds } = await request.json();

    await pool.execute(
      `UPDATE sources
       SET name = ?, type = ?, identifier = ?, description = ?, city = ?, is_active = ?
       WHERE id = ?`,
      [
        name || null,
        type || null,
        identifier || null,
        description || null,
        city || null,
        is_active !== undefined ? is_active : true,
        id,
      ]
    );

    if (tagIds !== undefined) {
      await pool.execute('DELETE FROM source_tags WHERE source_id = ?', [id]);
      if (tagIds.length > 0) {
        for (const tagId of tagIds) {
          await pool.execute(
            'INSERT INTO source_tags (source_id, tag_id) VALUES (?, ?)',
            [id, tagId]
          );
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Fuente actualizada exitosamente' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar fuente', message: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(request, { params }) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const pool = getDatabase();
    const { id } = await params;
    await pool.execute('UPDATE sources SET is_active = FALSE WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Fuente desactivada exitosamente' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al desactivar fuente', message: error.message },
      { status: 400 }
    );
  }
}
