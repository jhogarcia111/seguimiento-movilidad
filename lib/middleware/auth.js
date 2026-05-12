import { NextResponse } from 'next/server';
import { verifyToken, getUserById } from '../services/authService.js';

/**
 * Helper de autenticación para Route Handlers de Next.js.
 *
 * Uso:
 *   const auth = await requireAuth(request);
 *   if (auth instanceof NextResponse) return auth;
 *   const { user } = auth; // { id, username, role, ... }
 *
 * Opciones:
 *   { admin: true }   → exige role === 'admin'
 *   { active: true }  → verifica en BD que el usuario esté is_active=true
 */
export async function requireAuth(request, options = {}) {
  const { admin = false, active = false } = options;

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        error: 'Token de autenticación requerido',
        message: 'Debes incluir un token Bearer en el header Authorization',
      },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  let user;
  try {
    user = verifyToken(token);
  } catch (error) {
    return NextResponse.json(
      { error: 'Token inválido', message: error.message },
      { status: 401 }
    );
  }

  if (admin && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Acceso denegado', message: 'Esta acción requiere permisos de administrador' },
      { status: 403 }
    );
  }

  if (active) {
    try {
      const dbUser = await getUserById(user.id);
      if (!dbUser || !dbUser.is_active) {
        return NextResponse.json(
          { error: 'Usuario inactivo', message: 'Tu cuenta ha sido desactivada' },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Error verificando usuario', message: error.message },
        { status: 500 }
      );
    }
  }

  return { user };
}

/**
 * Atajo: requiere admin autenticado.
 */
export function requireAdmin(request) {
  return requireAuth(request, { admin: true });
}

/**
 * Atajo: requiere usuario autenticado y activo.
 */
export function requireActiveUser(request) {
  return requireAuth(request, { active: true });
}
