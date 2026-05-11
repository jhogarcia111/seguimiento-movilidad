import express from 'express';
import { authenticateUser, createUser } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Autentica un usuario y retorna token
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Username y contraseña son requeridos'
      });
    }

    const result = await authenticateUser(username, password);

    // Registrar actividad de login si el login fue exitoso
    if (result.user && result.token) {
      try {
        const { logActivity } = await import('../database/activities.js');
        await logActivity(result.user.id, 'login', {
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        // No fallar el login si falla el registro de actividad
        console.error('Error registrando actividad de login:', error);
      }
    }

    res.json({
      success: true,
      message: 'Login exitoso',
      ...result
    });
  } catch (error) {
    res.status(401).json({
      error: 'Error de autenticación',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/register
 * Registra un nuevo usuario (solo usuarios normales)
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Username, email y contraseña son requeridos'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Contraseña inválida',
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const user = await createUser({
      username,
      email,
      password,
      role: 'usuario' // Solo usuarios normales pueden registrarse
    });

    // Enviar email de bienvenida (registro recibido) al usuario
    try {
      const { sendRegistrationEmail } = await import('../services/emailService.js');
      await sendRegistrationEmail(username, email);
    } catch (error) {
      // No fallar el registro si falla el email
      console.error('Error enviando email de registro:', error);
    }

    // Crear notificación para administradores cuando se registra un nuevo usuario
    try {
      const { createNotification } = await import('../database/notifications.js');
      await createNotification({
        type: 'new_user',
        title: 'Nuevo usuario registrado',
        message: `El usuario "${username}" (${email}) se ha registrado y está pendiente de aprobación.`,
        linkUrl: '/admin?tab=users',
        userId: user.id
      });
    } catch (error) {
      // No fallar el registro si falla la notificación
      console.error('Error creando notificación de nuevo usuario:', error);
    }

    // Enviar email a todos los administradores sobre el nuevo registro
    try {
      const { sendNewUserNotificationToAdmins } = await import('../services/emailService.js');
      await sendNewUserNotificationToAdmins(username, email);
    } catch (error) {
      // No fallar el registro si falla el email a administradores
      console.error('Error enviando email a administradores:', error);
    }

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user
    });
  } catch (error) {
    res.status(400).json({
      error: 'Error al registrar usuario',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Obtiene información del usuario actual
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const { getUserById } = await import('../services/authService.js');
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener información del usuario',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Registra actividad de logout
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { logActivity } = await import('../database/activities.js');
    await logActivity(req.user.id, 'logout', {
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Logout registrado'
    });
  } catch (error) {
    // No fallar el logout si falla el registro
    console.error('Error registrando actividad de logout:', error);
    res.json({
      success: true,
      message: 'Logout registrado (con error en actividad)'
    });
  }
});

/**
 * POST /api/auth/app-open
 * Registra actividad de apertura de aplicación
 */
router.post('/app-open', authenticate, async (req, res) => {
  try {
    const { logActivity } = await import('../database/activities.js');
    await logActivity(req.user.id, 'app_open', {
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'App open registrado'
    });
  } catch (error) {
    // No fallar si falla el registro
    console.error('Error registrando actividad de app_open:', error);
    res.json({
      success: true,
      message: 'App open registrado (con error en actividad)'
    });
  }
});

export default router;
