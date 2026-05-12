import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getDatabase, ensureDatabaseInitialized } from '@/lib/db/db';
import { sendActivationEmail } from '@/lib/services/emailService';

export const runtime = 'nodejs';

export async function PUT(request, { params }) {
  await ensureDatabaseInitialized();
  const auth = await requireAuth(request, { admin: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const pool = getDatabase();
    const { id } = await params;
    const { approval_status } = await request.json();

    if (!approval_status || !['active', 'pending', 'inactive'].includes(approval_status)) {
      return NextResponse.json(
        {
          error: 'Estado de aprobación inválido',
          message: 'approval_status debe ser: active, pending o inactive',
        },
        { status: 400 }
      );
    }

    if (parseInt(id, 10) === auth.user.id && approval_status === 'inactive') {
      return NextResponse.json(
        { error: 'No puedes desactivar tu propia cuenta' },
        { status: 400 }
      );
    }

    const isActive = approval_status === 'active';
    await pool.execute(
      'UPDATE users SET approval_status = ?, is_active = ? WHERE id = ?',
      [approval_status, isActive, id]
    );

    if (approval_status === 'active') {
      try {
        const [users] = await pool.execute(
          'SELECT username, email FROM users WHERE id = ?',
          [id]
        );
        if (users.length > 0) {
          console.log(`📧 Intentando enviar email de activación a: ${users[0].email}`);
          const result = await sendActivationEmail(users[0].username, users[0].email);
          if (result.success) {
            console.log(`✅ Email de activación enviado exitosamente a: ${users[0].email}`);
          } else {
            console.error(`❌ Error enviando email de activación: ${result.error || 'Error desconocido'}`);
          }
        } else {
          console.warn(`⚠️ No se encontró el usuario con ID ${id} para enviar email de activación`);
        }
      } catch (error) {
        console.error('❌ Error enviando email de activación:', error);
      }
    }

    const msg =
      approval_status === 'active'
        ? 'activado'
        : approval_status === 'pending'
        ? 'marcado como pendiente'
        : 'desactivado';

    return NextResponse.json({
      success: true,
      message: `Usuario ${msg} exitosamente`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar estado de aprobación', message: error.message },
      { status: 400 }
    );
  }
}
