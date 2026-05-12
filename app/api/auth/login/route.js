import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/services/authService';
import { logActivity } from '@/lib/db/activities';
import { ensureDatabaseInitialized } from '@/lib/db/db';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    await ensureDatabaseInitialized();
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Datos incompletos', message: 'Username y contraseña son requeridos' },
        { status: 400 }
      );
    }

    let result;
    try {
      result = await authenticateUser(username, password);
    } catch (error) {
      return NextResponse.json(
        { error: 'Error de autenticación', message: error.message },
        { status: 401 }
      );
    }

    if (result.user && result.token) {
      try {
        await logActivity(result.user.id, 'login', { timestamp: new Date().toISOString() });
      } catch (error) {
        console.error('Error registrando actividad de login:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Login exitoso',
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error de autenticación', message: error.message },
      { status: 500 }
    );
  }
}
