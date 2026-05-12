import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getDatabase, ensureDatabaseInitialized } from '@/lib/db/db';
import { createUser } from '@/lib/services/authService';

export const runtime = 'nodejs';

export async function GET(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const pool = getDatabase();
    const [users] = await pool.execute(
      `SELECT
        u.id, u.username, u.email, u.role,
        u.is_active, u.approval_status,
        u.created_at, u.updated_at,
        COALESCE(COUNT(ua.id), 0) as activity_count
       FROM users u
       LEFT JOIN user_activities ua ON u.id = ua.user_id
       GROUP BY u.id, u.username, u.email, u.role, u.is_active, u.approval_status, u.created_at, u.updated_at
       ORDER BY u.created_at DESC`
    );
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener usuarios', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const user = await createUser(body);
    return NextResponse.json(
      { success: true, message: 'Usuario creado exitosamente', user },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear usuario', message: error.message },
      { status: 400 }
    );
  }
}
