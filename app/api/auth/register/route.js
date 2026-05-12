import { NextResponse } from 'next/server';
import { createUser } from '@/lib/services/authService';
import { sendRegistrationEmail, sendNewUserNotificationToAdmins } from '@/lib/services/emailService';
import { createNotification } from '@/lib/db/notifications';
import { ensureDatabaseInitialized } from '@/lib/db/db';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    await ensureDatabaseInitialized();
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Datos incompletos', message: 'Username, email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Contraseña inválida', message: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    let user;
    try {
      user = await createUser({ username, email, password, role: 'usuario' });
    } catch (error) {
      return NextResponse.json(
        { error: 'Error al registrar usuario', message: error.message },
        { status: 400 }
      );
    }

    try {
      await sendRegistrationEmail(username, email);
    } catch (error) {
      console.error('Error enviando email de registro:', error);
    }

    try {
      await createNotification({
        type: 'new_user',
        title: 'Nuevo usuario registrado',
        message: `El usuario "${username}" (${email}) se ha registrado y está pendiente de aprobación.`,
        linkUrl: '/admin?tab=users',
        userId: user.id,
      });
    } catch (error) {
      console.error('Error creando notificación de nuevo usuario:', error);
    }

    try {
      await sendNewUserNotificationToAdmins(username, email);
    } catch (error) {
      console.error('Error enviando email a administradores:', error);
    }

    return NextResponse.json(
      { success: true, message: 'Usuario registrado exitosamente', user },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al registrar usuario', message: error.message },
      { status: 500 }
    );
  }
}
