import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getDatabase, ensureDatabaseInitialized } from '@/lib/db/db';
import bcrypt from 'bcrypt';

export const runtime = 'nodejs';

export async function PUT(request, { params }) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const pool = getDatabase();
    const { id } = await params;
    const { username, email, role, is_active, password } = await request.json();

    const updates = [];
    const values = [];

    if (username) { updates.push('username = ?'); values.push(username); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (role) { updates.push('role = ?'); values.push(role); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    values.push(id);
    await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    return NextResponse.json({ success: true, message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar usuario', message: error.message },
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

    if (parseInt(id, 10) === auth.user.id) {
      return NextResponse.json(
        { error: 'No puedes desactivar tu propia cuenta' },
        { status: 400 }
      );
    }

    await pool.execute(
      'UPDATE users SET is_active = FALSE, approval_status = ? WHERE id = ?',
      ['inactive', id]
    );

    return NextResponse.json({ success: true, message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al desactivar usuario', message: error.message },
      { status: 400 }
    );
  }
}
