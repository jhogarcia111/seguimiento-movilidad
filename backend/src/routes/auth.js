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

export default router;
