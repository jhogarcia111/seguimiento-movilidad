import { verifyToken } from '../services/authService.js';

/**
 * Middleware para verificar autenticación
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autenticación requerido',
        message: 'Debes incluir un token Bearer en el header Authorization'
      });
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    try {
      const decoded = verifyToken(token);
      req.user = decoded; // Agregar usuario decodificado al request
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Token inválido',
        message: error.message
      });
    }
  } catch (error) {
    return res.status(401).json({
      error: 'Error de autenticación',
      message: error.message
    });
  }
}

/**
 * Middleware para verificar que el usuario es admin
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'No autenticado'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Esta acción requiere permisos de administrador'
    });
  }

  next();
}

/**
 * Middleware para verificar que el usuario está activo
 */
export async function requireActiveUser(req, res, next) {
  try {
    const { getUserById } = await import('../services/authService.js');
    const user = await getUserById(req.user.id);

    if (!user || !user.is_active) {
      return res.status(403).json({
        error: 'Usuario inactivo',
        message: 'Tu cuenta ha sido desactivada'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Error verificando usuario',
      message: error.message
    });
  }
}
