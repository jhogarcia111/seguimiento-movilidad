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
    const [sources] = await pool.execute(`
      SELECT s.*,
             string_agg(
               concat(t.id::text, ':', t.name, ':', t.color),
               ','
               ORDER BY t.name
             ) as tags
      FROM sources s
      LEFT JOIN source_tags st ON s.id = st.source_id
      LEFT JOIN tags t ON st.tag_id = t.id
      GROUP BY s.id
      ORDER BY s.name
    `);

    const sourcesWithTags = sources.map((source) => ({
      ...source,
      tags: source.tags
        ? source.tags.split(',').map((tagStr) => {
            const [id, name, color] = tagStr.split(':');
            return { id: parseInt(id, 10), name, color };
          })
        : [],
    }));

    return NextResponse.json({ success: true, sources: sourcesWithTags });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener fuentes', message: error.message },
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
    const { name, type, identifier, description, city, tagIds = [] } = await request.json();

    if (!name || !type || !identifier) {
      return NextResponse.json(
        { error: 'Datos incompletos', message: 'name, type e identifier son requeridos' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO sources (name, type, identifier, description, city, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, type, identifier, description || null, city || null, true]
    );

    const sourceId = result.insertId;
    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        await pool.execute(
          'INSERT INTO source_tags (source_id, tag_id) VALUES (?, ?) ON CONFLICT (source_id, tag_id) DO NOTHING',
          [sourceId, tagId]
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Fuente creada exitosamente',
        source: { id: sourceId, name, type, identifier },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear fuente', message: error.message },
      { status: 400 }
    );
  }
}
